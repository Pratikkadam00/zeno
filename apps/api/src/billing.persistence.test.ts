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

const { applyWebhookEvent, clearEntitlementCache, deleteEntitlementForUser, getCachedEntitlement } = await import("./billing");

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
});

describe("what is persisted", () => {
  it("a webhook grant is stored under the app user id with the time it was cached", () => {
    applyWebhookEvent({ event: { app_user_id: "acct_1", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"], expiration_at_ms: T0 + 30 * MINUTE } });
    expect(kv.rows.get("acct_1")).toEqual({
      entitlement: { plan: "pro", active: true, expiresAt: new Date(T0 + 30 * MINUTE).toISOString(), source: "cache" },
      cachedAtMs: T0
    });
  });

  it("an ignored webhook body persists nothing", () => {
    applyWebhookEvent({});
    applyWebhookEvent({ event: { type: "RENEWAL", entitlement_ids: ["pro"] } });
    expect(kv.persisted).toEqual([]);
  });

  it("a CANCELLATION deletes the persisted row too, so a restart cannot bring the old answer back", () => {
    applyWebhookEvent({ event: { app_user_id: "acct_2", type: "RENEWAL", entitlement_ids: ["pro"] } });
    applyWebhookEvent({ event: { app_user_id: "acct_2", type: "CANCELLATION", entitlement_ids: ["pro"] } });
    expect(kv.deleted).toEqual(["billing/acct_2"]);
    restart();
    expect(getCachedEntitlement("acct_2")).toBeUndefined();
  });

  it("account deletion removes the row; clearing drops the namespace", () => {
    applyWebhookEvent({ event: { app_user_id: "acct_3", type: "RENEWAL", entitlement_ids: ["pro"] } });
    deleteEntitlementForUser("acct_3");
    expect(kv.deleted).toEqual(["billing/acct_3"]);
    expect(kv.rows.has("acct_3")).toBe(false);
    kv.cleared.length = 0;
    clearEntitlementCache();
    expect(kv.cleared).toEqual(["billing"]);
  });
});

describe("restart (hydration) never resets the TTL or resurrects a grant", () => {
  it("a restored entry keeps its ORIGINAL cache time: still served inside the 10-minute window, stale after it", () => {
    applyWebhookEvent({ event: { app_user_id: "acct_ttl", type: "RENEWAL", entitlement_ids: ["family"] } });
    vi.setSystemTime(T0 + 9 * MINUTE);
    restart();
    expect(getCachedEntitlement("acct_ttl")?.plan).toBe("family");
    vi.setSystemTime(T0 + 10 * MINUTE + 1);
    expect(kv.rows.get("acct_ttl")).toMatchObject({ cachedAtMs: T0 }); // the row is still there to hydrate
    restart();
    expect(getCachedEntitlement("acct_ttl")).toBeUndefined();
  });

  it("a restored grant past its own expiry is not served even inside the TTL window", () => {
    applyWebhookEvent({ event: { app_user_id: "acct_exp", type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: T0 + 2 * MINUTE } });
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
