import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * billing.ts against its storage boundary. `./storage/pg` is replaced by a fake
 * table holding a JSON SNAPSHOT of each written value (what the jsonb column
 * stores), so these tests check what is persisted and how the registered
 * hydrator treats rows after a restart — in particular that a restart can
 * never reset the entitlement TTL or resurrect an expired grant.
 */
type Entry = { key: string; value: unknown };
const kv = vi.hoisted(() => ({
  rows: new Map<string, unknown>(),
  hydrators: new Map<string, (entries: { key: string; value: unknown }[]) => void>(),
  persisted: [] as string[],
  deleted: [] as string[],
  cleared: [] as string[]
}));

vi.mock("./storage/pg", () => ({
  registerHydrator: (namespace: string, hydrate: (entries: { key: string; value: unknown }[]) => void) => {
    kv.hydrators.set(namespace, hydrate);
  },
  kvPersist: (namespace: string, key: string, value: unknown) => {
    kv.persisted.push(`${namespace}/${key}`);
    if (namespace === "billing") kv.rows.set(key, JSON.parse(JSON.stringify(value)));
  },
  kvDeleteAwait: async (namespace: string, key: string) => {
    kv.deleted.push(`${namespace}/${key}`);
    if (namespace === "billing") kv.rows.delete(key);
    return true;
  },
  kvClear: async (namespace: string) => {
    kv.cleared.push(namespace);
    if (namespace === "billing") kv.rows.clear();
  }
}));

const { clearEntitlementCache, deleteEntitlementForUser, fetchEntitlement, getCachedEntitlement } = await import("./billing");

/** A verified RevenueCat answer for this user (fetch faked): since F85 the only
 *  way an entitlement is cached. */
function verify(appUserId: string, entitlements: Record<string, { expires_date: string | null }>) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ subscriber: { entitlements } }), { status: 200 }));
  return fetchEntitlement(appUserId);
}
const iso = (ms: number) => new Date(ms).toISOString();
const savedKey = process.env.REVENUECAT_SECRET_KEY;

const T0 = Date.parse("2026-09-30T12:00:00.000Z");
const MINUTE = 60_000;

/** Boot with exactly these rows in the table: wipe memory (clearing the fake
 *  table as a side effect), put the rows back as a real database would still
 *  hold them, then replay them through the registered hydrator. */
function hydrate(entries: Entry[]): void {
  clearEntitlementCache();
  for (const { key, value } of entries) kv.rows.set(key, value);
  kv.hydrators.get("billing")!(entries);
}

function restart(): void {
  hydrate([...kv.rows.entries()].map(([key, value]) => ({ key, value })));
}

beforeEach(() => {
  process.env.REVENUECAT_SECRET_KEY = "rc-test-secret";
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  clearEntitlementCache();
  kv.rows.clear();
  kv.persisted.length = 0;
  kv.deleted.length = 0;
  kv.cleared.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (savedKey === undefined) delete process.env.REVENUECAT_SECRET_KEY;
  else process.env.REVENUECAT_SECRET_KEY = savedKey;
});

describe("what is persisted", () => {
  it("a verified answer is stored under the app user id with the time it was cached", async () => {
    await verify("acct_1", { pro: { expires_date: iso(T0 + 30 * MINUTE) } });
    expect(kv.rows.get("acct_1")).toEqual({
      entitlement: { plan: "pro", active: true, expiresAt: iso(T0 + 30 * MINUTE), source: "revenuecat" },
      cachedAtMs: T0
    });
  });

  it("a failed lookup persists nothing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 503 }));
    await expect(fetchEntitlement("acct_down")).rejects.toThrow("RevenueCat responded 503");
    expect(kv.persisted).toEqual([]);
  });

  it("dropping the cached answer (a webhook, an account deletion) deletes the persisted row too, so a restart cannot bring the old answer back", async () => {
    await verify("acct_2", { pro: { expires_date: null } });
    expect(await deleteEntitlementForUser("acct_2")).toBe(true);
    expect(kv.deleted).toEqual(["billing/acct_2"]);
    expect(kv.rows.has("acct_2")).toBe(false);
    restart();
    expect(getCachedEntitlement("acct_2")).toBeUndefined();
  });

  it("clearing drops the namespace", () => {
    clearEntitlementCache();
    expect(kv.cleared).toEqual(["billing"]);
  });
});

describe("restart (hydration) never resets the TTL or resurrects a grant", () => {
  it("a restored entry keeps its ORIGINAL cache time: still served inside the 10-minute window, stale after it", async () => {
    await verify("acct_ttl", { family: { expires_date: null } });
    vi.setSystemTime(T0 + 9 * MINUTE);
    restart();
    expect(getCachedEntitlement("acct_ttl")?.plan).toBe("family");
    vi.setSystemTime(T0 + 10 * MINUTE + 1);
    expect(kv.rows.get("acct_ttl")).toMatchObject({ cachedAtMs: T0 }); // the row is still there to hydrate
    restart();
    expect(getCachedEntitlement("acct_ttl")).toBeUndefined();
  });

  it("a restored grant past its own expiry is not served even inside the TTL window", async () => {
    await verify("acct_exp", { pro: { expires_date: iso(T0 + 2 * MINUTE) } });
    vi.setSystemTime(T0 + 3 * MINUTE);
    restart();
    expect(getCachedEntitlement("acct_exp")).toBeUndefined();
  });

  it("a row whose cachedAtMs is missing or not a number is treated as already stale", () => {
    const entitlement = { plan: "pro", active: true, expiresAt: null, source: "cache" };
    hydrate([
      { key: "no-time", value: { entitlement } },
      { key: "string-time", value: { entitlement, cachedAtMs: String(T0) } }
    ]);
    expect(getCachedEntitlement("no-time")).toBeUndefined();
    expect(getCachedEntitlement("string-time")).toBeUndefined();
  });

  it("an older bare-entitlement row (no wrapper) is treated as already stale → re-verify", () => {
    hydrate([{ key: "legacy", value: { plan: "family", active: true, expiresAt: null, source: "cache" } }]);
    expect(getCachedEntitlement("legacy")).toBeUndefined();
  });

  it("a null row does not crash hydration and grants nothing", () => {
    expect(() => hydrate([{ key: "null-row", value: null }])).not.toThrow();
    expect(getCachedEntitlement("null-row")).toBeUndefined();
  });
});
