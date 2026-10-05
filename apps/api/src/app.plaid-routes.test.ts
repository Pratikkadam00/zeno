import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Plaid routes in app.ts with Plaid CONFIGURED, P1.10. The whole ./plaid
 * module is faked, so no request reaches Plaid or its sandbox (the integration
 * stays dev-only by standing instruction). What is pinned here is OUR handler:
 *  - identity comes from the verified token, never the request body;
 *  - the bank access token never leaves the server (only the item id is returned);
 *  - one user can never read another user's bank item;
 *  - upstream failures are a fixed 502 message (F31); sandbox minting is sandbox-only.
 */
const plaid = vi.hoisted(() => ({
  items: new Map<string, { accessToken: string; itemId: string }>(),
  linkToken: vi.fn(),
  exchange: vi.fn(),
  transactions: vi.fn(),
  sandbox: vi.fn()
}));
vi.mock("./plaid", () => ({
  plaidConfigured: () => true,
  createLinkToken: (...a: unknown[]) => plaid.linkToken(...a),
  exchangePublicToken: (...a: unknown[]) => plaid.exchange(...a),
  getRecentTransactions: (...a: unknown[]) => plaid.transactions(...a),
  sandboxPublicToken: (...a: unknown[]) => plaid.sandbox(...a),
  storePlaidItem: (userId: string, item: { accessToken: string; itemId: string }) => { plaid.items.set(userId, item); },
  getStoredPlaidItem: (userId: string) => plaid.items.get(userId),
  deletePlaidItem: (userId: string) => { plaid.items.delete(userId); }
}));

const { buildApp } = await import("./app");
type App = Awaited<ReturnType<typeof buildApp>>;

async function session(app: App, email: string): Promise<{ token: string; accountId: string }> {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const raw = decodeURIComponent((requested.json().data.devLink as string).split("token=")[1]!);
  const data = (await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: raw } })).json().data;
  return { token: data.accessToken, accountId: data.accountId };
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

beforeEach(() => {
  plaid.items.clear();
  for (const fn of [plaid.linkToken, plaid.exchange, plaid.transactions, plaid.sandbox]) fn.mockReset();
  delete process.env.PLAID_ENV;
});

describe("link token", () => {
  it("is created for the TOKEN's account, whatever the body claims", async () => {
    const app = await buildApp();
    const me = await session(app, "link@zeno.test");
    plaid.linkToken.mockResolvedValue({ linkToken: "link-1", expiration: "2026-10-01T00:00:00Z" });
    const r = await app.inject({ method: "POST", url: "/api/v1/plaid/link-token", headers: auth(me.token), payload: { userId: "acct_someone_else" } });
    expect(r.json().data).toEqual({ linkToken: "link-1", expiration: "2026-10-01T00:00:00Z" });
    expect(plaid.linkToken).toHaveBeenCalledWith(me.accountId);
  });

  it("an upstream failure is a fixed 502", async () => {
    const app = await buildApp();
    const me = await session(app, "link-fail@zeno.test");
    plaid.linkToken.mockRejectedValue(new Error("Plaid /link/token/create failed (400): INVALID_API_KEYS"));
    const r = await app.inject({ method: "POST", url: "/api/v1/plaid/link-token", headers: auth(me.token) });
    expect(r.statusCode).toBe(502);
    expect(r.json().error).toEqual({ code: "UPSTREAM_ERROR", message: "Plaid request failed." });
  });
});

describe("public-token exchange", () => {
  it("validates the public token (present, at most 512 characters)", async () => {
    const app = await buildApp();
    const me = await session(app, "exchange-bad@zeno.test");
    for (const payload of [{}, { publicToken: "" }, { publicToken: "p".repeat(513) }]) {
      const r = await app.inject({ method: "POST", url: "/api/v1/plaid/exchange", headers: auth(me.token), payload });
      expect(r.statusCode).toBe(400);
    }
    expect(plaid.exchange).not.toHaveBeenCalled();
  });

  it("stores the bank item under the caller's account and returns ONLY the item id, never the access token", async () => {
    const app = await buildApp();
    const me = await session(app, "exchange@zeno.test");
    plaid.exchange.mockResolvedValue({ accessToken: "access-bank-credential", itemId: "item-1" });
    const r = await app.inject({ method: "POST", url: "/api/v1/plaid/exchange", headers: auth(me.token), payload: { publicToken: "public-1" } });
    expect(r.json().data).toEqual({ itemId: "item-1", connected: true });
    expect(r.body).not.toContain("access-bank-credential");
    expect(plaid.items.get(me.accountId)).toEqual({ accessToken: "access-bank-credential", itemId: "item-1" });
  });

  it("an upstream failure is a fixed 502 and stores nothing", async () => {
    const app = await buildApp();
    const me = await session(app, "exchange-fail@zeno.test");
    plaid.exchange.mockRejectedValue(new Error("Plaid failed (400): INVALID_PUBLIC_TOKEN"));
    const r = await app.inject({ method: "POST", url: "/api/v1/plaid/exchange", headers: auth(me.token), payload: { publicToken: "public-1" } });
    expect(r.statusCode).toBe(502);
    expect(r.json().error.message).toBe("Plaid request failed.");
    expect(plaid.items.size).toBe(0);
  });
});

describe("transactions", () => {
  it("without a linked bank → 409; with one, reads with THAT user's own access token only", async () => {
    const app = await buildApp();
    const alice = await session(app, "alice-bank@zeno.test");
    const bob = await session(app, "bob-bank@zeno.test");
    plaid.items.set(alice.accountId, { accessToken: "alice-access", itemId: "item-a" });
    const none = await app.inject({ method: "POST", url: "/api/v1/plaid/transactions", headers: auth(bob.token) });
    expect(none.statusCode).toBe(409);
    expect(plaid.transactions).not.toHaveBeenCalled();
    plaid.transactions.mockResolvedValue([{ date: "2026-09-01", name: "Netflix", amountMinor: 1549, currency: "USD" }]);
    const mine = await app.inject({ method: "POST", url: "/api/v1/plaid/transactions", headers: auth(alice.token) });
    expect(mine.json().data).toEqual({ transactions: [{ date: "2026-09-01", name: "Netflix", amountMinor: 1549, currency: "USD" }], count: 1 });
    expect(plaid.transactions).toHaveBeenCalledWith("alice-access");
  });

  it("an upstream failure is a fixed 502", async () => {
    const app = await buildApp();
    const me = await session(app, "txn-fail@zeno.test");
    plaid.items.set(me.accountId, { accessToken: "a", itemId: "i" });
    plaid.transactions.mockRejectedValue(new Error("Plaid /transactions/sync failed (400): ITEM_LOGIN_REQUIRED"));
    const r = await app.inject({ method: "POST", url: "/api/v1/plaid/transactions", headers: auth(me.token) });
    expect(r.statusCode).toBe(502);
    expect(r.body).not.toContain("ITEM_LOGIN_REQUIRED");
  });
});

describe("sandbox public-token minting", () => {
  it("is refused outside sandbox, works in sandbox, and fails with a fixed 502", async () => {
    const app = await buildApp();
    const me = await session(app, "sandbox@zeno.test");
    const mint = () => app.inject({ method: "POST", url: "/api/v1/plaid/sandbox/public-token", headers: auth(me.token) });
    process.env.PLAID_ENV = "production";
    expect((await mint()).statusCode).toBe(503);
    expect(plaid.sandbox).not.toHaveBeenCalled();
    delete process.env.PLAID_ENV; // unset means sandbox
    plaid.sandbox.mockResolvedValueOnce("public-sandbox-1");
    expect((await mint()).json().data).toEqual({ publicToken: "public-sandbox-1" });
    plaid.sandbox.mockRejectedValueOnce(new Error("sandbox down"));
    const failed = await mint();
    expect(failed.statusCode).toBe(502);
    expect(failed.json().error.message).toBe("Plaid request failed.");
  });
});
