import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Second suite for api/client.ts (client.test.ts pins the §7 taxonomy). This one
// covers what that file leaves out: the account-deletion confirmation contract,
// malformed 2xx envelopes on the family calls, request shapes, the diagnostics
// status call, the open-banking intent call, and the POST helper behind the
// Plaid calls. The Plaid code is only exercised through the fetch boundary here;
// none of it is changed. Mocked boundaries: timedFetch (./http), the global
// fetch (the two calls that bypass timedFetch), the API base URL, and the auth
// store's access token.

const BASE = "https://api.test/v1";
vi.mock("./config", () => ({ getApiBaseUrl: () => BASE }));
vi.mock("./http", () => ({ timedFetch: vi.fn() }));

// The token source can resolve a token, resolve null (signed out), or throw
// (a keychain read failing), so each call's handling of all three is testable.
let readToken: () => Promise<string | null> = async () => "tok_abc";
vi.mock("../auth/authStore", () => ({
  useAuthStore: { getState: () => ({ getValidAccessToken: () => readToken() }) }
}));

const { timedFetch } = await import("./http");
const client = await import("./client");
const mockedFetch = vi.mocked(timedFetch);

// Minimal Response stand-in: client code only reads .ok, .status and .json().
function res(status: number, body: unknown, opts: { jsonThrows?: boolean } = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: opts.jsonThrows
      ? async () => { throw new SyntaxError("Unexpected token < in JSON at position 0"); }
      : async () => body
  } as unknown as Response;
}

const OFFLINE = new TypeError("Network request failed");
const household = { id: "h1", shareCode: "ABC123", ownerId: "u1", members: [], createdAt: "2026-07-01T00:00:00.000Z" };

type Init = { method?: string; headers?: Record<string, string>; body?: string };
const initOf = (call = 0) => (mockedFetch.mock.calls[call]?.[1] ?? {}) as Init;

beforeEach(() => {
  readToken = async () => "tok_abc";
  mockedFetch.mockReset();
});

describe("deleteAccountOnServer — true ONLY when the server confirms the deletion", () => {
  // Settings wipes the device and signs out only on `true`, telling the user the
  // account is gone. So `true` must mean the API's own confirmation (app.ts
  // answers DELETE /account with ok({ deleted: true })), not just "some 2xx".

  it("is true for the API's confirmation envelope { data: { deleted: true } }", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { deleted: true }, error: null, meta: { requestId: "r" } }));
    expect(await client.deleteAccountOnServer()).toBe(true);
  });

  it("is false for a 2xx that is not that confirmation (unparseable body, no data, deleted not true)", async () => {
    // e.g. a proxy/captive page or a misconfigured base URL answering 200 HTML.
    mockedFetch.mockResolvedValueOnce(res(200, null, { jsonThrows: true }));
    expect(await client.deleteAccountOnServer()).toBe(false);
    mockedFetch.mockResolvedValueOnce(res(200, {}));
    expect(await client.deleteAccountOnServer()).toBe(false);
    mockedFetch.mockResolvedValueOnce(res(200, { data: { deleted: false } }));
    expect(await client.deleteAccountOnServer()).toBe(false);
    mockedFetch.mockResolvedValueOnce(res(200, { data: { deleted: "true" } }));
    expect(await client.deleteAccountOnServer()).toBe(false);
  });

  it("is false on 401 (signed out or session already revoked) and on 5xx", async () => {
    mockedFetch.mockResolvedValueOnce(res(401, { data: null, error: { code: "UNAUTHORIZED", message: "no" } }));
    expect(await client.deleteAccountOnServer()).toBe(false);
    mockedFetch.mockResolvedValueOnce(res(503, { data: { deleted: true } }));
    expect(await client.deleteAccountOnServer()).toBe(false);
  });

  it("is false (and sends nothing) when reading the access token throws", async () => {
    readToken = async () => { throw new Error("keychain unavailable"); };
    expect(await client.deleteAccountOnServer()).toBe(false);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("sends no Authorization header when signed out (the server then refuses with 401)", async () => {
    readToken = async () => null;
    mockedFetch.mockResolvedValueOnce(res(401, {}));
    expect(await client.deleteAccountOnServer()).toBe(false);
    expect(initOf().headers).toEqual({});
  });

  it("never retries the DELETE (no retry option passed to timedFetch)", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { deleted: true } }));
    await client.deleteAccountOnServer();
    expect(mockedFetch.mock.calls[0]?.[2]).toBeUndefined();
  });
});

describe("getHousehold — a malformed 2xx is a server error, never 'household gone'", () => {
  // family.tsx DELETES its stored household pointer on reason 'not_found'. The
  // API reports a missing (or disbanded) household with 404; it never answers
  // 2xx without a household. So only a 404 may produce 'not_found'.

  it("404 (the API's answer for a missing or disbanded household) → 'not_found'", async () => {
    mockedFetch.mockResolvedValueOnce(res(404, { data: null, error: { code: "NOT_FOUND", message: "Household not found." } }));
    expect(await client.getHousehold("h1")).toEqual({ ok: false, reason: "not_found" });
  });

  it("2xx with an unparseable body → 'server', so the stored household pointer survives", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, null, { jsonThrows: true }));
    expect(await client.getHousehold("h1")).toEqual({ ok: false, reason: "server" });
  });

  it("403 (caller is not a member) → 'server', not 'not_found'", async () => {
    mockedFetch.mockResolvedValueOnce(res(403, { data: null, error: { code: "FORBIDDEN", message: "x" } }));
    expect(await client.getHousehold("h1")).toEqual({ ok: false, reason: "server" });
  });

  it("GETs the percent-encoded id with the bearer token and one retry (an idempotent read)", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household } }));
    await client.getHousehold("a/b c");
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/family/a%2Fb%20c`);
    expect(initOf().headers).toEqual({ Authorization: "Bearer tok_abc" });
    expect(mockedFetch.mock.calls[0]?.[2]).toEqual({ retries: 1 });
  });

  it("reading the access token throwing resolves to a failure result instead of rejecting", async () => {
    readToken = async () => { throw new Error("keychain unavailable"); };
    expect(await client.getHousehold("h1")).toMatchObject({ ok: false });
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe("family POSTs (create / join / setMemberSpend) — request shape and malformed 2xx", () => {
  it("joinHousehold: 2xx with an unparseable body → 'server' (not a false success)", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, null, { jsonThrows: true }));
    expect(await client.joinHousehold("ABC123", "u2", "Mem", 1000, "USD")).toEqual({ ok: false, reason: "server" });
  });

  it("joinHousehold: posts the share code and member fields as JSON with the bearer token, no retries", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household } }));
    expect(await client.joinHousehold("ABC123", "u2", "Mem", 1250, "EUR")).toEqual({ ok: true, data: household });
    const [url, init, opts] = mockedFetch.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE}/family/join`);
    expect((init as Init).method).toBe("POST");
    expect((init as Init).headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok_abc" });
    expect(JSON.parse((init as Init).body ?? "")).toEqual({ shareCode: "ABC123", memberId: "u2", memberName: "Mem", monthlySpendMinor: 1250, currency: "EUR" });
    expect(opts).toBeUndefined();
  });

  it("createHousehold: posts to /family/create with the owner fields", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household } }));
    await client.createHousehold("u1", "Owner", 999, "GBP");
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/family/create`);
    expect(JSON.parse(initOf().body ?? "")).toEqual({ ownerId: "u1", ownerName: "Owner", monthlySpendMinor: 999, currency: "GBP" });
  });

  it("setMemberSpend: sends only the spend and currency; a 409 maps to 'server'", async () => {
    mockedFetch.mockResolvedValueOnce(res(409, { data: null, error: { code: "CONFLICT", message: "x" } }));
    expect(await client.setMemberSpend("h1", 4200, "INR")).toEqual({ ok: false, reason: "server" });
    expect(JSON.parse(initOf().body ?? "")).toEqual({ monthlySpendMinor: 4200, currency: "INR" });
  });

  it("a network throw on setMemberSpend → 'offline'", async () => {
    mockedFetch.mockRejectedValueOnce(OFFLINE);
    expect(await client.setMemberSpend("h1", 1, "USD")).toEqual({ ok: false, reason: "offline" });
  });
});

describe("leaveHousehold — request shape", () => {
  it("POSTs to the percent-encoded /leave path with the bearer token", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { household: null } }));
    expect(await client.leaveHousehold("h/1")).toBe(true);
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/family/h%2F1/leave`);
    expect(initOf()).toEqual({ method: "POST", headers: { Authorization: "Bearer tok_abc" } });
  });
});

describe("getAiCoaching — request shape and an envelope without data", () => {
  const input = { totalMonthlyMinor: 5000, currency: "USD", subscriptions: [{ name: "N", category: "video", monthlyMinor: 1599, billingCycle: "monthly" }] };

  it("posts the input as JSON with the bearer token", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { source: "unconfigured", model: "none" } }));
    await client.getAiCoaching(input);
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/coach`);
    expect(initOf().method).toBe("POST");
    expect(initOf().headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer tok_abc" });
    expect(JSON.parse(initOf().body ?? "")).toEqual(input);
  });

  it("a 2xx envelope with data: null → 'server'", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: null, error: null }));
    expect(await client.getAiCoaching(input)).toEqual({ ok: false, reason: "server" });
  });
});

describe("getServerEntitlement — request shape", () => {
  it("GETs /billing/entitlement with the bearer token and one retry", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { plan: "free", active: false, source: "none" } }));
    await client.getServerEntitlement();
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/billing/entitlement`);
    expect(initOf()).toEqual({ headers: { Authorization: "Bearer tok_abc" } });
    expect(mockedFetch.mock.calls[0]?.[2]).toEqual({ retries: 1 });
  });

  it("returns null (no throw) when reading the access token throws", async () => {
    readToken = async () => { throw new Error("keychain unavailable"); };
    expect(await client.getServerEntitlement()).toBeNull();
  });
});

describe("getMobileBackendStatus — remaining branches (diagnostics screen)", () => {
  it("GETs the public /capabilities route without a bearer token, retrying once", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: { phase: "P5", capabilities: [] } }));
    await client.getMobileBackendStatus();
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/capabilities`);
    expect(mockedFetch.mock.calls[0]?.[1]).toEqual({});
    expect(mockedFetch.mock.calls[0]?.[2]).toEqual({ retries: 1 });
  });

  it("a reachable host answering 2xx without data: reported connected, with no phase and no capabilities", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: null }));
    const status = await client.getMobileBackendStatus();
    expect(status).toEqual({
      connected: true,
      apiBaseUrl: BASE,
      phase: undefined,
      capabilities: [],
      message: "Mobile frontend is connected to the Fastify API."
    });
  });

  it("a 2xx with an unparseable body → not connected, carrying the parse error", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, null, { jsonThrows: true }));
    const status = await client.getMobileBackendStatus();
    expect(status.connected).toBe(false);
    expect(status.message).toBe("Unexpected token < in JSON at position 0");
  });

  it("a non-Error rejection falls back to a generic message", async () => {
    mockedFetch.mockRejectedValueOnce("socket closed");
    const status = await client.getMobileBackendStatus();
    expect(status).toEqual({ connected: false, apiBaseUrl: BASE, capabilities: [], message: "Backend connection failed." });
  });
});

describe("POST helper behind the Plaid calls (fetch boundary only)", () => {
  it("createPlaidLinkToken: POSTs an empty JSON body with the bearer token and returns envelope.data", async () => {
    const data = { linkToken: "link-sandbox-x", expiration: "2026-10-01T00:00:00.000Z" };
    mockedFetch.mockResolvedValueOnce(res(200, { data }));
    expect(await client.createPlaidLinkToken()).toEqual(data);
    expect(mockedFetch.mock.calls[0]?.[0]).toBe(`${BASE}/plaid/link-token`);
    expect(initOf()).toEqual({ method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer tok_abc" }, body: "{}" });
  });

  it("rejects with the API's error message on a non-2xx", async () => {
    mockedFetch.mockResolvedValueOnce(res(503, { data: null, error: { code: "UNAVAILABLE", message: "Bank connect is not configured." } }));
    await expect(client.createPlaidLinkToken()).rejects.toThrow("Bank connect is not configured.");
  });

  it("rejects with the path and status when a non-2xx carries no error message", async () => {
    mockedFetch.mockResolvedValueOnce(res(502, { data: null, error: null }));
    await expect(client.createPlaidLinkToken()).rejects.toThrow("/plaid/link-token failed (HTTP 502)");
  });

  it("rejects (never resolves undefined) on a 2xx whose envelope has no data", async () => {
    mockedFetch.mockResolvedValueOnce(res(200, { data: null, error: null }));
    await expect(client.createPlaidLinkToken()).rejects.toThrow("/plaid/link-token failed (HTTP 200)");
  });

  it("connectPlaidSandbox: public token → exchange (token forwarded) → transactions, returning the count", async () => {
    mockedFetch
      .mockResolvedValueOnce(res(200, { data: { publicToken: "public-sandbox-1" } }))
      .mockResolvedValueOnce(res(200, { data: { itemId: "item-1", connected: true } }))
      .mockResolvedValueOnce(res(200, { data: { count: 17 } }));
    expect(await client.connectPlaidSandbox()).toEqual({ transactionCount: 17 });
    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${BASE}/plaid/sandbox/public-token`,
      `${BASE}/plaid/exchange`,
      `${BASE}/plaid/transactions`
    ]);
    expect(JSON.parse(initOf(1).body ?? "")).toEqual({ publicToken: "public-sandbox-1" });
  });

  it("connectPlaidSandbox: stops at the first failing step", async () => {
    mockedFetch
      .mockResolvedValueOnce(res(200, { data: { publicToken: "public-sandbox-1" } }))
      .mockResolvedValueOnce(res(400, { data: null, error: { code: "BAD_REQUEST", message: "exchange refused" } }));
    await expect(client.connectPlaidSandbox()).rejects.toThrow("exchange refused");
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});

describe("createOpenBankingIntentViaApi (global fetch)", () => {
  let globalFetch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const intent = { provider: "mx", status: "requires_server_configuration" };

  it("POSTs to /open-banking/:provider/intent with the bearer token and returns the intent", async () => {
    globalFetch.mockResolvedValueOnce(res(200, { data: { intent } }));
    expect(await client.createOpenBankingIntentViaApi("mx")).toEqual(intent);
    expect(globalFetch).toHaveBeenCalledWith(`${BASE}/open-banking/mx/intent`, { method: "POST", headers: { Authorization: "Bearer tok_abc" } });
  });

  it("rejects with the HTTP status on a non-2xx", async () => {
    globalFetch.mockResolvedValueOnce(res(502, {}));
    await expect(client.createOpenBankingIntentViaApi("plaid")).rejects.toThrow("Open banking intent failed with HTTP 502");
  });

  it("rejects with the API's message on a 2xx without an intent", async () => {
    globalFetch.mockResolvedValueOnce(res(200, { data: null, error: { code: "X", message: "Provider not configured." } }));
    await expect(client.createOpenBankingIntentViaApi("mx")).rejects.toThrow("Provider not configured.");
  });

  it("rejects with a fixed message on a 2xx with neither intent nor error", async () => {
    globalFetch.mockResolvedValueOnce(res(200, { data: {} }));
    await expect(client.createOpenBankingIntentViaApi("mx")).rejects.toThrow("Open banking intent missing from API response.");
  });
});
