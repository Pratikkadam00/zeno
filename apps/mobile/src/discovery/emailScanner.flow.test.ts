import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Gmail side of discovery, end to end against a FAKE Gmail API: OAuth
 * connect (token or PKCE code exchange), the account registry, the paged
 * message listing and its 400-message cap, the known-sender / subject gate,
 * per-message failure isolation, MIME body extraction and decoding, the date
 * fallbacks, progress reporting across inboxes, and disconnect/revocation.
 */

const http = vi.hoisted(() => ({ timedFetch: vi.fn() }));
vi.mock("../api/http", () => http);

const auth = vi.hoisted(() => ({ exchangeCodeAsync: vi.fn() }));
vi.mock("expo-auth-session", () => auth);
vi.mock("expo-auth-session/providers/google", () => ({ discovery: { tokenEndpoint: "https://oauth2.googleapis.com/token" } }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "abcdef12-3456-7890-abcd-ef1234567890" }));

const vault = vi.hoisted(() => ({ accounts: new Map<string, string>() }));
vi.mock("../security/secure-store", () => ({
  saveGmailAccount: vi.fn(async (address: string, token: string) => {
    vault.accounts.set(address, token);
  }),
  listGmailAddresses: vi.fn(async () => [...vault.accounts.keys()]),
  getGmailAccountToken: vi.fn(async (address: string) => vault.accounts.get(address) ?? null),
  removeGmailAccount: vi.fn(async (address: string) => {
    vault.accounts.delete(address);
  })
}));

const scanner = await import("./emailScanner");

// ── fake Gmail ──────────────────────────────────────────────────────────────
type Msg = { id: string; from: string; subject: string; date?: string; internalDate?: string; payload?: unknown; failMeta?: boolean; failFull?: boolean };
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

function fakeGmail(inboxes: Record<string, { messages: Msg[]; pageSize?: number; profile?: string | null; listStatus?: number }>) {
  const calls: { url: URL; token: string | undefined; init: RequestInit }[] = [];
  http.timedFetch.mockImplementation(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const token = (init.headers as Record<string, string> | undefined)?.Authorization?.replace("Bearer ", "");
    calls.push({ url, token, init });
    if (url.href.startsWith(scanner.GOOGLE_REVOKE_URL)) return json({});
    const inbox = token ? inboxes[token] : undefined;
    if (!inbox) return json({ error: "no such token" }, 401);
    if (url.pathname.endsWith("/profile")) {
      return inbox.profile === null ? json({}, 500) : json(inbox.profile === undefined ? {} : { emailAddress: inbox.profile });
    }
    if (url.pathname.endsWith("/messages")) {
      if (inbox.listStatus) return json({}, inbox.listStatus);
      const size = inbox.pageSize ?? 100;
      const start = Number(url.searchParams.get("pageToken") ?? "0");
      const page = inbox.messages.slice(start, start + size);
      const next = start + size < inbox.messages.length ? String(start + size) : undefined;
      return json({ messages: page.length ? page.map((m) => ({ id: m.id, threadId: `t-${m.id}` })) : undefined, nextPageToken: next });
    }
    const id = decodeURIComponent(url.pathname.split("/").pop()!);
    const msg = inbox.messages.find((m) => m.id === id);
    if (!msg) return json({}, 404);
    const headers = [
      { name: "From", value: msg.from },
      { name: "Subject", value: msg.subject },
      ...(msg.date ? [{ name: "Date", value: msg.date }] : [])
    ];
    if (url.searchParams.get("format") === "metadata") {
      if (msg.failMeta) return json({}, 429);
      return json({ id: msg.id, payload: { headers } });
    }
    if (msg.failFull) throw new Error("socket hang up");
    return json({ id: msg.id, threadId: `t-${msg.id}`, internalDate: msg.internalDate, payload: { headers, ...(msg.payload as object) } });
  });
  return calls;
}

const textBody = (s: string) => ({ mimeType: "text/plain", body: { data: b64(s) } });

beforeEach(() => {
  vault.accounts.clear();
  http.timedFetch.mockReset();
  auth.exchangeCodeAsync.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

// ── connect ────────────────────────────────────────────────────────────────
const request = (codeVerifier?: string) => ({ clientId: "client-1", redirectUri: "app.zeno:/oauth", codeVerifier }) as never;
const success = (over: Record<string, unknown> = {}) => ({ type: "success", errorCode: null, params: { code: "auth-code" }, authentication: null, url: "x", ...over }) as never;

describe("connectGmail", () => {
  it("refuses a cancelled or dismissed authorization", async () => {
    await expect(scanner.connectGmail(request(), { type: "cancel" } as never)).rejects.toThrow("Gmail authorization was cancelled.");
    await expect(scanner.connectGmail(request(), { type: "dismiss" } as never)).rejects.toThrow("Gmail authorization was cancelled.");
  });

  it("uses a token returned directly, stores it under the Gmail address", async () => {
    fakeGmail({ "tok-direct": { messages: [], profile: "Person@Gmail.com" } });
    const account = await scanner.connectGmail(request(), success({ authentication: { accessToken: "tok-direct" } }));
    expect(account).toEqual({ address: "Person@Gmail.com", token: "tok-direct" });
    expect(vault.accounts.get("Person@Gmail.com")).toBe("tok-direct");
    expect(auth.exchangeCodeAsync).not.toHaveBeenCalled();
  });

  it("otherwise exchanges the code with PKCE (code_verifier), gmail.readonly scope, no client secret", async () => {
    fakeGmail({ "tok-exchanged": { messages: [], profile: "a@x.com" } });
    auth.exchangeCodeAsync.mockResolvedValue({ accessToken: "tok-exchanged" });
    await scanner.connectGmail(request("verifier-123"), success());
    const [params] = auth.exchangeCodeAsync.mock.calls[0]!;
    expect(params).toEqual({
      clientId: "client-1",
      code: "auth-code",
      redirectUri: "app.zeno:/oauth",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      extraParams: { code_verifier: "verifier-123" }
    });
    expect(params).not.toHaveProperty("clientSecret");
  });

  it("omits extraParams when the request has no code verifier", async () => {
    fakeGmail({ t: { messages: [], profile: "a@x.com" } });
    auth.exchangeCodeAsync.mockResolvedValue({ accessToken: "t" });
    await scanner.connectGmail(request(), success());
    expect(auth.exchangeCodeAsync.mock.calls[0]![0].extraParams).toBeUndefined();
  });

  it("fails clearly when Google returns no authorization code", async () => {
    await expect(scanner.connectGmail(request(), success({ params: {} }))).rejects.toThrow("Google did not return an authorization code.");
  });

  it("F12: if the profile lookup fails, the fallback label is random and contains NO part of the token", async () => {
    fakeGmail({ "ya29.SECRETPREFIX-rest": { messages: [], profile: null } });
    const account = await scanner.connectGmail(request(), success({ authentication: { accessToken: "ya29.SECRETPREFIX-rest" } }));
    expect(account.address).toBe("inbox-abcdef12");
    expect(account.address.toLowerCase()).not.toContain("ya29");
    expect(account.address.toLowerCase()).not.toContain("secret");
  });
});

describe("account registry", () => {
  it("lists only accounts that still have a token", async () => {
    vault.accounts.set("a@x.com", "t1");
    vault.accounts.set("b@x.com", "");
    expect(await scanner.listConnectedGmailAccounts()).toEqual([{ address: "a@x.com", token: "t1" }]);
  });

  it("fetchGmailAddress returns the address, or null when the profile has none", async () => {
    fakeGmail({ t1: { messages: [], profile: "a@x.com" }, t2: { messages: [] } });
    expect(await scanner.fetchGmailAddress("t1")).toBe("a@x.com");
    expect(await scanner.fetchGmailAddress("t2")).toBeNull();
  });
});

// ── listing, gating, bodies ─────────────────────────────────────────────────
describe("fetchBillingEmails", () => {
  it("pages through results with the billing query, sending the bearer token and asking for JSON", async () => {
    const messages = Array.from({ length: 3 }, (_, i) => ({ id: `m${i}`, from: "Netflix <info@netflix.com>", subject: "Your receipt", payload: textBody("$15.49") }));
    const calls = fakeGmail({ tok: { messages, pageSize: 2 } });
    const out = await scanner.fetchBillingEmails("tok");
    expect(out.map((m) => m.id)).toEqual(["m0", "m1", "m2"]);
    const lists = calls.filter((c) => c.url.pathname.endsWith("/messages"));
    expect(lists).toHaveLength(2);
    expect(lists[0]!.url.searchParams.get("q")).toContain("newer_than:365d");
    expect(lists[0]!.url.searchParams.get("maxResults")).toBe("100");
    expect(lists[0]!.url.searchParams.has("pageToken")).toBe(false);
    expect(lists[1]!.url.searchParams.get("pageToken")).toBe("2");
    for (const c of calls) {
      expect((c.init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
      expect((c.init.headers as Record<string, string>).Accept).toBe("application/json");
    }
  });

  it("never fetches more than 400 messages per inbox", async () => {
    const messages = Array.from({ length: 450 }, (_, i) => ({ id: `m${i}`, from: "x@unknown.example", subject: "hello" }));
    const calls = fakeGmail({ tok: { messages } });
    await scanner.fetchBillingEmails("tok");
    expect(calls.filter((c) => c.url.pathname.endsWith("/messages"))).toHaveLength(4);
    expect(calls.filter((c) => c.url.searchParams.get("format") === "metadata")).toHaveLength(400);
  });

  it("an empty inbox (no messages field) yields nothing", async () => {
    fakeGmail({ tok: { messages: [] } });
    expect(await scanner.fetchBillingEmails("tok")).toEqual([]);
  });

  it("a Gmail error on the listing is surfaced with its HTTP status", async () => {
    fakeGmail({ tok: { messages: [], listStatus: 403 } });
    await expect(scanner.fetchBillingEmails("tok")).rejects.toThrow("Gmail request failed with HTTP 403.");
  });

  it("known billing senders are always read; unknown senders only with a subscription subject", async () => {
    const calls = fakeGmail({
      tok: {
        messages: [
          { id: "known", from: "Spotify <no-reply@mail.spotify.com>", subject: "Thanks", payload: textBody("$11.99") },
          { id: "unknown-signal", from: "Shop <billing@coolapp.io>", subject: "Your monthly subscription renewed", payload: textBody("$4.00") },
          { id: "unknown-noise", from: "Shop <orders@coolapp.io>", subject: "Your order shipped", payload: textBody("$40.00") }
        ]
      }
    });
    const out = await scanner.fetchBillingEmails("tok");
    expect(out.map((m) => [m.id, m.senderDomain])).toEqual([["known", "spotify.com"], ["unknown-signal", "coolapp.io"]]);
    // The noise message was never downloaded in full.
    expect(calls.some((c) => c.url.pathname.endsWith("/unknown-noise") && c.url.searchParams.get("format") === "full")).toBe(false);
  });

  it("one failing message (rate limit, deleted mid-scan) is skipped; the scan continues", async () => {
    fakeGmail({
      tok: {
        messages: [
          { id: "a", from: "info@netflix.com", subject: "r", failMeta: true },
          { id: "b", from: "info@netflix.com", subject: "r", failFull: true },
          { id: "c", from: "info@netflix.com", subject: "r", payload: textBody("$15.49") }
        ]
      }
    });
    expect((await scanner.fetchBillingEmails("tok")).map((m) => m.id)).toEqual(["c"]);
  });

  it("URL-encodes message ids", async () => {
    const calls = fakeGmail({ tok: { messages: [{ id: "a/b?c", from: "info@netflix.com", subject: "r", payload: textBody("$1.00") }] } });
    await scanner.fetchBillingEmails("tok");
    expect(calls.some((c) => c.url.pathname.endsWith("/a%2Fb%3Fc"))).toBe(true);
  });

  const one = async (payload: unknown, extra: Partial<Msg> = {}) => {
    fakeGmail({ tok: { messages: [{ id: "m", from: "info@netflix.com", subject: "s", payload, ...extra }] } });
    return (await scanner.fetchBillingEmails("tok"))[0]!;
  };

  it("body: a single text part is decoded as UTF-8 (currency symbols survive)", async () => {
    expect((await one(textBody("Total €15,49 — merci"))).body).toBe("Total €15,49 — merci");
  });

  it("body: a single HTML part is stripped to text", async () => {
    expect((await one({ mimeType: "text/html", body: { data: b64("<p>Total <b>$9.99</b></p>") } })).body).toBe("Total $9.99");
  });

  it("body: multipart prefers text/plain, found at any depth", async () => {
    const payload = { mimeType: "multipart/mixed", parts: [{ mimeType: "multipart/alternative", parts: [{ mimeType: "text/html", body: { data: b64("<b>html</b>") } }, textBody("plain wins")] }] };
    expect((await one(payload)).body).toBe("plain wins");
  });

  it("body: multipart with only HTML uses the stripped HTML", async () => {
    const payload = { mimeType: "multipart/alternative", parts: [{ mimeType: "text/html", body: { data: b64("<i>only html</i>") } }] };
    expect((await one(payload)).body).toBe("only html");
  });

  it("body: no readable part, or no payload at all, gives an empty body", async () => {
    expect((await one({ mimeType: "multipart/mixed", parts: [{ mimeType: "image/png", body: {} }] })).body).toBe("");
    fakeGmail({ tok: { messages: [{ id: "m", from: "info@netflix.com", subject: "s" }] } });
    http.timedFetch.mockImplementationOnce(async () => json({ messages: [{ id: "m" }] }));
    http.timedFetch.mockImplementationOnce(async () => json({ id: "m", payload: { headers: [{ name: "From", value: "info@netflix.com" }, { name: "Subject", value: "s" }] } }));
    http.timedFetch.mockImplementationOnce(async () => json({ id: "m" }));
    const [m] = await scanner.fetchBillingEmails("tok");
    expect(m!.body).toBe("");
    expect(m!.subject).toBe("");
  });

  it("body: bytes that are not valid UTF-8 fall back to the raw binary string; invalid base64 gives empty", async () => {
    const latin1 = Buffer.from([0x50, 0x72, 0x69, 0x63, 0x65, 0x20, 0xa3, 0x35]).toString("base64url"); // "Price £5" in Latin-1
    expect((await one({ mimeType: "text/plain", body: { data: latin1 } })).body).toBe("Price £5");
    expect((await one({ mimeType: "text/plain", body: { data: "***not base64***" } })).body).toBe("");
  });

  it("date: the Date header wins; else Gmail's internalDate; else now", async () => {
    expect((await one(textBody("x"), { date: "Tue, 15 Sep 2026 10:00:00 +0000" })).receivedAt).toBe("2026-09-15T10:00:00.000Z");
    expect((await one(textBody("x"), { date: "not a date", internalDate: String(Date.UTC(2026, 0, 2)) })).receivedAt).toBe("2026-01-02T00:00:00.000Z");
    vi.useFakeTimers({ now: new Date("2026-09-30T12:00:00Z"), toFake: ["Date"] });
    expect((await one(textBody("x"), { internalDate: "garbage" })).receivedAt).toBe("2026-09-30T12:00:00.000Z");
  });
});

// ── scanning & progress ─────────────────────────────────────────────────────
describe("scanning", () => {
  it("scanGmailSubscriptions reports progress per message and returns processed detections", async () => {
    fakeGmail({
      tok: {
        messages: [
          { id: "1", from: "info@netflix.com", subject: "Your Netflix receipt", payload: textBody("You were charged $15.49 per month") },
          { id: "2", from: "info@netflix.com", subject: "Your Netflix receipt", payload: textBody("no amount here") }
        ]
      }
    });
    const progress: [number, number][] = [];
    const found = await scanner.scanGmailSubscriptions("tok", (c, t) => progress.push([c, t]));
    expect(progress).toEqual([[0, 2], [1, 2], [2, 2]]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ name: "Netflix", amount: 15.49, billingCycle: "monthly" });
  });

  it("scanAllGmailAccounts: no connected inbox → no network, empty result", async () => {
    const calls = fakeGmail({});
    expect(await scanner.scanAllGmailAccounts(() => {})).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("scanAllGmailAccounts merges inboxes and reports progress in MESSAGES across all of them", async () => {
    vault.accounts.set("a@x.com", "ta");
    vault.accounts.set("b@x.com", "tb");
    fakeGmail({
      ta: { messages: [{ id: "a1", from: "info@netflix.com", subject: "r", payload: textBody("$15.49 per month") }] },
      tb: {
        messages: [
          { id: "b1", from: "no-reply@spotify.com", subject: "r", payload: textBody("$11.99 per month") },
          { id: "b2", from: "no-reply@spotify.com", subject: "r", payload: textBody("$11.99 per month") }
        ]
      }
    });
    const progress: [number, number][] = [];
    const found = await scanner.scanAllGmailAccounts((c, t) => progress.push([c, t]));
    expect(progress).toEqual([[0, 1], [1, 1], [1, 3], [2, 3], [3, 3]]);
    expect(found.map((f) => f.name).sort()).toEqual(["Netflix", "Spotify"]);
  });
});

// ── disconnect ──────────────────────────────────────────────────────────────
describe("disconnectGmailAccount (F12: revoke per RFC 7009, token in the BODY)", () => {
  it("POSTs the token form-encoded to Google's revoke endpoint, never in the URL, then forgets the account", async () => {
    vault.accounts.set("a@x.com", "ya29.tok/with+chars");
    const calls = fakeGmail({});
    await scanner.disconnectGmailAccount("a@x.com");
    expect(calls).toHaveLength(1);
    const [c] = calls;
    expect(c!.url.href).toBe("https://oauth2.googleapis.com/revoke");
    expect(c!.url.search).toBe("");
    expect(c!.init.method).toBe("POST");
    expect((c!.init.headers as Record<string, string>)["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(c!.init.body).toBe("token=ya29.tok%2Fwith%2Bchars");
    expect(vault.accounts.has("a@x.com")).toBe(false);
  });

  it("still forgets the account locally when revocation fails, and reports the failure", async () => {
    vault.accounts.set("a@x.com", "t");
    http.timedFetch.mockRejectedValue(new Error("offline"));
    await expect(scanner.disconnectGmailAccount("a@x.com")).rejects.toThrow("offline");
    expect(vault.accounts.has("a@x.com")).toBe(false);
  });

  it("with no stored token, just forgets the account (no network call)", async () => {
    const calls = fakeGmail({});
    await scanner.disconnectGmailAccount("ghost@x.com");
    expect(calls).toHaveLength(0);
  });
});

describe("disconnectAllGmailAccounts (F27: the erase disconnects every inbox)", () => {
  it("revokes each inbox at Google and forgets it locally", async () => {
    vault.accounts.set("a@x.com", "tok-a");
    vault.accounts.set("b@x.com", "tok-b");
    const calls = fakeGmail({});
    await scanner.disconnectAllGmailAccounts();
    expect(calls.map((c) => c.init.body)).toEqual(["token=tok-a", "token=tok-b"]);
    expect(vault.accounts.size).toBe(0);
  });

  it("removes one inbox at a time, so the shared address index cannot race", async () => {
    // A faithful removal: read the index, yield (a keychain round-trip), write it
    // back filtered. Two of these in parallel both read the same index and the
    // second write resurrects the first address.
    const secureStore = await import("../security/secure-store");
    vi.mocked(secureStore.removeGmailAccount).mockImplementation(async (address: string) => {
      const snapshot = new Map(vault.accounts);
      await new Promise((resolve) => setTimeout(resolve, 0));
      snapshot.delete(address);
      vault.accounts.clear();
      for (const [k, v] of snapshot) vault.accounts.set(k, v);
    });
    try {
      for (const a of ["a@x.com", "b@x.com", "c@x.com"]) vault.accounts.set(a, `tok-${a}`);
      fakeGmail({});
      await scanner.disconnectAllGmailAccounts();
      expect([...vault.accounts.keys()]).toEqual([]);
    } finally {
      vi.mocked(secureStore.removeGmailAccount).mockImplementation(async (address: string) => {
        vault.accounts.delete(address);
      });
    }
  });

  it("a failed revoke does not stop the others; every inbox is still forgotten, then it rejects", async () => {
    vault.accounts.set("a@x.com", "tok-a");
    vault.accounts.set("b@x.com", "tok-b");
    const bodies: unknown[] = [];
    http.timedFetch.mockImplementation(async (_url: string, init: RequestInit) => {
      bodies.push(init.body);
      if (init.body === "token=tok-a") throw new Error("offline");
      return json({});
    });
    await expect(scanner.disconnectAllGmailAccounts()).rejects.toThrow("1 of 2 Gmail inboxes could not be fully disconnected");
    expect(bodies).toEqual(["token=tok-a", "token=tok-b"]);
    expect(vault.accounts.size).toBe(0);
  });

  it("with no inboxes connected, resolves without any network call", async () => {
    const calls = fakeGmail({});
    await scanner.disconnectAllGmailAccounts();
    expect(calls).toHaveLength(0);
  });
});
