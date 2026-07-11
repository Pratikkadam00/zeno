import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// client.ts talks to the API through timedFetch (./http) and derives identity
// from the auth store's access token. Both are mocked so these tests exercise
// ONE thing: the §7 error taxonomy — that every call maps a network throw / 401
// / 404 / 500 / malformed-envelope to the right discriminated result, instead of
// collapsing every failure to a single null (which is what made a household join
// say "no household found" when the phone was merely offline). Plaid paths are
// intentionally not exercised (kept as code only while Plaid is in dev).

const BASE = "https://api.test/v1";
vi.mock("./config", () => ({ getApiBaseUrl: () => BASE }));
vi.mock("./http", () => ({ timedFetch: vi.fn() }));

// Controllable signed-in token — authHeaders() attaches a bearer only when set.
let mockToken: string | null = "tok_abc";
vi.mock("../auth/authStore", () => ({
  useAuthStore: { getState: () => ({ getValidAccessToken: async () => mockToken }) }
}));

const { timedFetch } = await import("./http");
const client = await import("./client");
const mockedFetch = vi.mocked(timedFetch);

// Minimal Response stand-in: client code only reads .ok, .status, and .json().
function res(status: number, body: unknown, opts: { jsonThrows?: boolean } = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: opts.jsonThrows
      ? async () => { throw new SyntaxError("Unexpected end of JSON input"); }
      : async () => body
  } as unknown as Response;
}

const OFFLINE = new TypeError("Network request failed");

beforeEach(() => {
  mockToken = "tok_abc";
  mockedFetch.mockReset();
});

describe("getAiCoaching — the coach ApiResult taxonomy (P5.3)", () => {
  const input = { totalMonthlyMinor: 5000, subscriptions: [] };

  it("maps a network throw to reason 'offline'", async () => {
    mockedFetch.mockRejectedValueOnce(OFFLINE);
    expect(await client.getAiCoaching(input)).toEqual({ ok: false, reason: "offline" });
  });

  it("maps 401 to 'auth'", async () => {
    mockedFetch.mockResolvedValueOnce(res(401, { error: { message: "no" } }));
    expect(await client.getAiCoaching(input)).toEqual({ ok: false, reason: "auth" });
  });

  it("maps 404 to 'not_found'", async () => {
    mockedFetch.mockResolvedValueOnce(res(404, {}));
    expect(await client.getAiCoaching(input)).toEqual({ ok: false, reason: "not_found" });
  });

  it("maps 500 to 'server'", async () => {
    mockedFetch.mockResolvedValueOnce(res(500, {}));
    expect(await client.getAiCoaching(input)).toEqual({ ok: false, reason: "server" });
  });

  it("maps a 200 with an unparseable/empty envelope to 'server' (not a false success)", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, null, { jsonThrows: true }));
    expect(await client.getAiCoaching(input)).toEqual({ ok: false, reason: "server" });
  });

  it("returns ok with the coaching payload on success", async () => {
    const data = { source: "ai", provider: "anthropic", model: "m", outOfScope: false, summary: "s", recommendations: [] };
    mockedFetch.mockResolvedValueOnce(res(200, { data }));
    expect(await client.getAiCoaching(input)).toEqual({ ok: true, data });
  });

  it("treats { source: 'unconfigured' } as a SUCCESSFUL result (no server AI key is not a failure)", async () => {
    const data = { source: "unconfigured", model: "none" };
    mockedFetch.mockResolvedValueOnce(res(200, { data }));
    const result = await client.getAiCoaching(input);
    expect(result).toEqual({ ok: true, data });
  });

  it("uses a longer (35s) timeout for the coach call", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { source: "unconfigured", model: "none" } }));
    await client.getAiCoaching(input);
    const opts = mockedFetch.mock.calls[0]?.[2];
    expect(opts?.timeoutMs).toBe(35_000);
  });
});

describe("family ApiResult taxonomy — create/join/setMemberSpend (P5.3)", () => {
  const household = { id: "h1", shareCode: "ABC123", ownerId: "u1", members: [], createdAt: "2026-07-01T00:00:00.000Z" };

  it("createHousehold: network throw → 'offline'", async () => {
    mockedFetch.mockRejectedValueOnce(OFFLINE);
    expect(await client.createHousehold("u1", "Owner", 1000, "USD")).toEqual({ ok: false, reason: "offline" });
  });

  it("joinHousehold: 401 → 'auth', 404 → 'not_found', 500 → 'server'", async () => {
    mockedFetch.mockResolvedValueOnce(res(401, {}));
    expect(await client.joinHousehold("ABC123", "u2", "Mem", 1000, "USD")).toEqual({ ok: false, reason: "auth" });
    mockedFetch.mockResolvedValueOnce(res(404, {}));
    expect(await client.joinHousehold("ABC123", "u2", "Mem", 1000, "USD")).toEqual({ ok: false, reason: "not_found" });
    mockedFetch.mockResolvedValueOnce(res(503, {}));
    expect(await client.joinHousehold("ABC123", "u2", "Mem", 1000, "USD")).toEqual({ ok: false, reason: "server" });
  });

  it("createHousehold: 200 with no household in the envelope → 'server' (a malformed success)", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: {} }));
    expect(await client.createHousehold("u1", "Owner", 1000, "USD")).toEqual({ ok: false, reason: "server" });
  });

  it("createHousehold: unwraps envelope.data.household on success", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household } }));
    expect(await client.createHousehold("u1", "Owner", 1000, "USD")).toEqual({ ok: true, data: household });
  });

  it("setMemberSpend: percent-encodes the householdId into the path", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household } }));
    await client.setMemberSpend("house/1 2", 2000, "USD");
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/family/house%2F1%202/spend`);
  });
});

describe("getHousehold — 'success but empty' means not_found, distinct from a server error (P5.3)", () => {
  const household = { id: "h1", shareCode: "ABC123", ownerId: "u1", members: [], createdAt: "2026-07-01T00:00:00.000Z" };

  it("network throw → 'offline'", async () => {
    mockedFetch.mockRejectedValueOnce(OFFLINE);
    expect(await client.getHousehold("h1")).toEqual({ ok: false, reason: "offline" });
  });

  it("401 → 'auth', 500 → 'server'", async () => {
    mockedFetch.mockResolvedValueOnce(res(401, {}));
    expect(await client.getHousehold("h1")).toEqual({ ok: false, reason: "auth" });
    mockedFetch.mockResolvedValueOnce(res(500, {}));
    expect(await client.getHousehold("h1")).toEqual({ ok: false, reason: "server" });
  });

  it("200 with no household (disbanded server-side) → 'not_found', NOT 'server'", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: {} }));
    expect(await client.getHousehold("h1")).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns the household on success", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household } }));
    expect(await client.getHousehold("h1")).toEqual({ ok: true, data: household });
  });
});

describe("leaveHousehold — best-effort boolean", () => {
  it("true on 2xx, false on non-ok, false on throw", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, {}));
    expect(await client.leaveHousehold("h1")).toBe(true);
    mockedFetch.mockResolvedValueOnce(res(500, {}));
    expect(await client.leaveHousehold("h1")).toBe(false);
    mockedFetch.mockRejectedValueOnce(OFFLINE);
    expect(await client.leaveHousehold("h1")).toBe(false);
  });
});

describe("deleteAccountOnServer — failure must NOT be swallowed into success", () => {
  it("true only on a confirmed 2xx; false on non-ok and on network throw", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, {}));
    expect(await client.deleteAccountOnServer()).toBe(true);
    // A 500 or offline must report false so the caller does NOT wipe local data
    // and tell the user their account is gone while server data still exists.
    mockedFetch.mockResolvedValueOnce(res(500, {}));
    expect(await client.deleteAccountOnServer()).toBe(false);
    mockedFetch.mockRejectedValueOnce(OFFLINE);
    expect(await client.deleteAccountOnServer()).toBe(false);
  });

  it("issues a DELETE with the bearer token attached", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, {}));
    await client.deleteAccountOnServer();
    const [url, init] = mockedFetch.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE}/account`);
    expect((init as RequestInit)?.method).toBe("DELETE");
    expect((init as { headers?: Record<string, string> })?.headers?.Authorization).toBe("Bearer tok_abc");
  });
});

describe("getServerEntitlement — soft-null fallback", () => {
  it("returns the entitlement on success", async () => {
    const ent = { plan: "pro", active: true, source: "revenuecat" };
    mockedFetch.mockResolvedValueOnce(res(200, { data: ent }));
    expect(await client.getServerEntitlement()).toEqual(ent);
  });

  it("returns null when unreachable, on non-ok, and on an empty envelope", async () => {
    mockedFetch.mockRejectedValueOnce(OFFLINE);
    expect(await client.getServerEntitlement()).toBeNull();
    mockedFetch.mockResolvedValueOnce(res(500, {}));
    expect(await client.getServerEntitlement()).toBeNull();
    mockedFetch.mockResolvedValueOnce(res(200, {}));
    expect(await client.getServerEntitlement()).toBeNull();
  });
});

describe("getMobileBackendStatus", () => {
  it("connected: true with phase + capabilities on success", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { phase: "P5", capabilities: ["coach", "family"] } }));
    const status = await client.getMobileBackendStatus();
    expect(status.connected).toBe(true);
    expect(status.phase).toBe("P5");
    expect(status.capabilities).toEqual(["coach", "family"]);
    expect(status.apiBaseUrl).toBe(BASE);
  });

  it("connected: false with an HTTP message on a non-ok response", async () => {
    mockedFetch.mockResolvedValueOnce(res(503, {}));
    const status = await client.getMobileBackendStatus();
    expect(status.connected).toBe(false);
    expect(status.capabilities).toEqual([]);
    expect(status.message).toContain("503");
  });

  it("connected: false carrying the error message on a network throw", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("dns fail"));
    const status = await client.getMobileBackendStatus();
    expect(status.connected).toBe(false);
    expect(status.message).toBe("dns fail");
  });
});

describe("authHeaders — identity comes from the token, never a client-supplied id", () => {
  it("attaches Authorization when signed in", async () => {
    mockToken = "tok_signed_in";
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household: { id: "h", shareCode: "s", ownerId: "o", members: [], createdAt: "2026-07-01T00:00:00.000Z" } } }));
    await client.createHousehold("u1", "Owner", 1000, "USD");
    const headers = (mockedFetch.mock.calls[0]?.[1] as { headers?: Record<string, string> })?.headers;
    expect(headers?.Authorization).toBe("Bearer tok_signed_in");
  });

  it("omits Authorization entirely when signed out (server then replies 401)", async () => {
    mockToken = null;
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household: { id: "h", shareCode: "s", ownerId: "o", members: [], createdAt: "2026-07-01T00:00:00.000Z" } } }));
    await client.createHousehold("u1", "Owner", 1000, "USD");
    const headers = (mockedFetch.mock.calls[0]?.[1] as { headers?: Record<string, string> })?.headers;
    expect(headers?.Authorization).toBeUndefined();
  });
});

describe("recordFunnelEvent — anonymous, unauthenticated, fire-and-forget", () => {
  let globalFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    globalFetch = vi.fn().mockResolvedValue(res(200, {}));
    vi.stubGlobal("fetch", globalFetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to /events with NO Authorization header even when signed in", async () => {
    mockToken = "tok_abc";
    client.recordFunnelEvent("import_completed");
    expect(globalFetch).toHaveBeenCalledTimes(1);
    const [url, init] = globalFetch.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE}/events`);
    const headers = (init as { headers?: Record<string, string> })?.headers ?? {};
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.parse((init as { body: string }).body)).toEqual({ event: "import_completed" });
  });

  it("includes the label when provided", async () => {
    client.recordFunnelEvent("free_cap_hit", "dashboard");
    const init = globalFetch.mock.calls[0]?.[1] as { body: string };
    expect(JSON.parse(init.body)).toEqual({ event: "free_cap_hit", label: "dashboard" });
  });

  it("never throws when the network rejects (a dropped ping must not surface)", async () => {
    globalFetch.mockRejectedValueOnce(new Error("offline"));
    expect(() => client.recordFunnelEvent("share_card_generated")).not.toThrow();
    // allow the swallowed rejection to settle
    await Promise.resolve();
  });
});
