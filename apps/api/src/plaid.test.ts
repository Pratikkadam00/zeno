import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * plaid.ts, P1.10: the adapter's own logic with Plaid's HTTP faked at the
 * module boundary (./http). Nothing here calls Plaid or its sandbox; the Plaid
 * integration itself stays dev-only by standing instruction.
 *
 *  - request shape (credentials from env, the user id as client_user_id) and
 *    response mapping; upstream errors carry the Plaid error code (server log
 *    only; the route returns a fixed message, F31);
 *  - F34: transaction normalization keeps Plaid's documented sign (positive =
 *    money out, negative = money in), skips unofficial currencies instead of
 *    calling them USD, and uses each currency's real minor-unit exponent;
 *  - token storage: in memory always, persisted ONLY sealed and only with an
 *    encryption key; hydration restores decryptable rows and warns on the rest.
 */
const calls = vi.hoisted(() => [] as { url: string; body: Record<string, unknown> }[]);
const replies = vi.hoisted(() => [] as { status: number; json: unknown }[]);
vi.mock("./http", () => ({
  fetchWithTimeout: vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    const next = replies.shift() ?? { status: 200, json: {} };
    return { ok: next.status >= 200 && next.status < 300, status: next.status, json: async () => next.json } as unknown as Response;
  })
}));

const store = vi.hoisted(() => ({
  encryption: false,
  persisted: [] as { ns: string; key: string; value: unknown }[],
  deleted: [] as string[],
  cleared: [] as string[],
  hydrators: new Map<string, (entries: { key: string; value: unknown }[]) => void>()
}));
vi.mock("./storage/pg", () => ({
  encryptionConfigured: () => store.encryption,
  sealValue: (value: unknown) => ({ enc: `sealed:${JSON.stringify(value)}`, kid: "k1" }),
  openValue: (stored: unknown) => {
    const enc = (stored as { enc?: unknown } | null)?.enc;
    return typeof enc === "string" && enc.startsWith("sealed:") ? JSON.parse(enc.slice("sealed:".length)) : null;
  },
  kvPersist: (ns: string, key: string, value: unknown) => { store.persisted.push({ ns, key, value }); },
  kvDeleteAwait: async (ns: string, key: string) => { store.deleted.push(`${ns}:${key}`); return true; },
  kvClear: async (ns: string) => { store.cleared.push(ns); },
  registerHydrator: (ns: string, fn: (entries: { key: string; value: unknown }[]) => void) => { store.hydrators.set(ns, fn); }
}));

const saved: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
beforeEach(() => {
  vi.resetModules();
  calls.length = 0;
  replies.length = 0;
  store.encryption = false;
  store.persisted.length = 0;
  store.deleted.length = 0;
  store.cleared.length = 0;
  store.hydrators.clear();
  setEnv("PLAID_CLIENT_ID", "client-test");
  setEnv("PLAID_SECRET", "secret-test");
  setEnv("PLAID_ENV", undefined);
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
    delete saved[k];
  }
  vi.restoreAllMocks();
});
const load = () => import("./plaid");
const txn = (over: Record<string, unknown> = {}) => ({ date: "2026-09-01", name: "NETFLIX.COM", amount: 15.49, iso_currency_code: "USD", ...over });

describe("configuration and environment", () => {
  it("is configured only with both a client id and a secret", async () => {
    const plaid = await load();
    expect(plaid.plaidConfigured()).toBe(true);
    setEnv("PLAID_SECRET", undefined);
    expect(plaid.plaidConfigured()).toBe(false);
  });

  it("talks to sandbox by default, and to development / production when PLAID_ENV says so", async () => {
    for (const [env, host] of [[undefined, "sandbox"], ["development", "development"], ["production", "production"], ["anything-else", "sandbox"]] as const) {
      vi.resetModules();
      setEnv("PLAID_ENV", env);
      const plaid = await load();
      calls.length = 0;
      replies.push({ status: 200, json: { public_token: "public-x" } });
      await plaid.sandboxPublicToken();
      expect(calls[0]!.url, String(env)).toBe(`https://${host}.plaid.com/sandbox/public_token/create`);
    }
  });
});

describe("requests and responses", () => {
  it("createLinkToken: env credentials, the account id as client_user_id, the response mapped", async () => {
    const plaid = await load();
    replies.push({ status: 200, json: { link_token: "link-1", expiration: "2026-10-01T00:00:00Z" } });
    expect(await plaid.createLinkToken("acct_42")).toEqual({ linkToken: "link-1", expiration: "2026-10-01T00:00:00Z" });
    expect(calls[0]).toEqual({
      url: "https://sandbox.plaid.com/link/token/create",
      body: { client_id: "client-test", secret: "secret-test", client_name: "Zeno", user: { client_user_id: "acct_42" }, products: ["transactions"], country_codes: ["US"], language: "en" }
    });
  });

  it("exchangePublicToken maps the access token and item id; the sandbox helper uses the given institution", async () => {
    const plaid = await load();
    replies.push({ status: 200, json: { access_token: "access-1", item_id: "item-1" } });
    expect(await plaid.exchangePublicToken("public-1")).toEqual({ accessToken: "access-1", itemId: "item-1" });
    expect(calls[0]!.body.public_token).toBe("public-1");
    replies.push({ status: 200, json: { public_token: "public-2" } });
    expect(await plaid.sandboxPublicToken("ins_1")).toBe("public-2");
    expect(calls[1]!.body).toMatchObject({ institution_id: "ins_1", initial_products: ["transactions"] });
  });

  it("an error names Plaid's error code, else its message, else 'unknown' (server-side only)", async () => {
    const plaid = await load();
    replies.push({ status: 400, json: { error_code: "INVALID_PUBLIC_TOKEN", error_message: "bad" } });
    await expect(plaid.exchangePublicToken("x")).rejects.toThrow("Plaid /item/public_token/exchange failed (400): INVALID_PUBLIC_TOKEN");
    replies.push({ status: 500, json: { error_message: "internal" } });
    await expect(plaid.createLinkToken("a")).rejects.toThrow("(500): internal");
    replies.push({ status: 503, json: {} });
    await expect(plaid.sandboxPublicToken()).rejects.toThrow("(503): unknown");
  });
});

describe("transactions (F34: Plaid's sign and currency kept honest)", () => {
  it("keeps the sign: charges positive, refunds and deposits NEGATIVE (never turned into charges)", async () => {
    const plaid = await load();
    replies.push({ status: 200, json: { added: [txn(), txn({ name: "PAYROLL", amount: -2500 }), txn({ name: "NETFLIX REFUND", amount: -15.49 })], next_cursor: "c1", has_more: false } });
    const out = await plaid.getRecentTransactions("access-1");
    expect(out.map((t) => [t.name, t.amountMinor])).toEqual([["NETFLIX.COM", 1549], ["PAYROLL", -250000], ["NETFLIX REFUND", -1549]]);
  });

  it("uses the currency's real minor-unit exponent, skips unofficial currencies, and prefers the merchant name", async () => {
    const plaid = await load();
    replies.push({ status: 200, json: { added: [
      txn({ amount: 1200, iso_currency_code: "JPY" }),
      txn({ amount: 1.234, iso_currency_code: "KWD" }),
      txn({ amount: 0.5, iso_currency_code: null, unofficial_currency_code: "BTC" }),
      txn({ amount: 9.99, iso_currency_code: "not-a-code" }),
      txn({ name: "SQ *COFFEE", merchant_name: "Blue Bottle", amount: 4.5 }),
      txn({ merchant_name: null, amount: 1 })
    ], next_cursor: "c1", has_more: false } });
    const out = await plaid.getRecentTransactions("access-1");
    expect(out).toEqual([
      { date: "2026-09-01", name: "NETFLIX.COM", amountMinor: 1200, currency: "JPY" },
      { date: "2026-09-01", name: "NETFLIX.COM", amountMinor: 1234, currency: "KWD" },
      { date: "2026-09-01", name: "Blue Bottle", amountMinor: 450, currency: "USD" },
      { date: "2026-09-01", name: "NETFLIX.COM", amountMinor: 100, currency: "USD" }
    ]);
  });

  it("follows the cursor across pages, and stops after 10 pages even if Plaid says there is more", async () => {
    const plaid = await load();
    replies.push({ status: 200, json: { added: [txn({ name: "A" })], next_cursor: "c1", has_more: true } });
    replies.push({ status: 200, json: { next_cursor: "c2", has_more: false } }); // no `added` at all
    const two = await plaid.getRecentTransactions("access-1");
    expect(two.map((t) => t.name)).toEqual(["A"]);
    expect(calls.map((c) => c.body.cursor)).toEqual([undefined, "c1"]);
    expect(calls.every((c) => c.body.access_token === "access-1")).toBe(true);

    calls.length = 0;
    for (let i = 0; i < 12; i += 1) replies.push({ status: 200, json: { added: [], next_cursor: `p${i}`, has_more: true } });
    await plaid.getRecentTransactions("access-1");
    expect(calls).toHaveLength(10);
  });
});

describe("token storage", () => {
  it("without an encryption key the token stays in memory only; delete and clear work", async () => {
    const plaid = await load();
    plaid.storePlaidItem("acct_1", { accessToken: "access-1", itemId: "item-1" });
    expect(plaid.getStoredPlaidItem("acct_1")).toEqual({ accessToken: "access-1", itemId: "item-1" });
    expect(store.persisted).toEqual([]);
    plaid.deletePlaidItem("acct_1");
    expect(plaid.getStoredPlaidItem("acct_1")).toBeUndefined();
    expect(store.deleted).toEqual(["plaid:acct_1"]);
    plaid.storePlaidItem("acct_2", { accessToken: "access-2", itemId: "item-2" });
    plaid.clearPlaidItems();
    expect(plaid.getStoredPlaidItem("acct_2")).toBeUndefined();
    expect(store.cleared).toEqual(["plaid"]);
  });

  it("with an encryption key it is persisted ONLY sealed, never as plaintext", async () => {
    store.encryption = true;
    const plaid = await load();
    plaid.storePlaidItem("acct_1", { accessToken: "access-1", itemId: "item-1" });
    expect(store.persisted).toHaveLength(1);
    const [row] = store.persisted;
    expect(row).toMatchObject({ ns: "plaid", key: "acct_1" });
    expect(row!.value).toEqual({ enc: expect.stringMatching(/^sealed:/), kid: "k1" });
    expect(row!.value).not.toHaveProperty("accessToken");
  });

  it("hydration restores decryptable rows, counts undecryptable ones in a warning, and ignores other garbage", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plaid = await load();
    const hydrate = store.hydrators.get("plaid")!;
    hydrate([
      { key: "acct_ok", value: { enc: `sealed:${JSON.stringify({ accessToken: "access-ok", itemId: "item-ok" })}`, kid: "k1" } },
      { key: "acct_rotated", value: { enc: "ciphertext-under-an-old-key", kid: "k0" } },
      { key: "acct_wrong_shape", value: { enc: `sealed:${JSON.stringify({ itemId: "no-token" })}`, kid: "k1" } },
      { key: "acct_garbage", value: null }
    ]);
    expect(plaid.getStoredPlaidItem("acct_ok")).toEqual({ accessToken: "access-ok", itemId: "item-ok" });
    for (const k of ["acct_rotated", "acct_wrong_shape", "acct_garbage"]) expect(plaid.getStoredPlaidItem(k)).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain("2 stored bank token(s) could not be decrypted");
    warn.mockClear();
    hydrate([{ key: "acct_ok2", value: { enc: `sealed:${JSON.stringify({ accessToken: "a", itemId: "i" })}`, kid: "k1" } }]);
    expect(warn).not.toHaveBeenCalled();
  });
});
