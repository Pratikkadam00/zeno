import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * billing-razorpay.ts against its storage boundary. `./storage/pg` is replaced
 * by a fake table holding a JSON SNAPSHOT of each written value (what the jsonb
 * column stores), so these tests check what a paid grant persists as, what the
 * hydrator does with the rows after a restart, and — the point of the file —
 * what happens when the database says no.
 *
 * A grant here is a receipt, not a cache: if the write is rejected the webhook
 * must not be acked, and if a revocation is rejected the grant must stay put
 * rather than vanish from memory while the row survives.
 */
type Entry = { key: string; value: unknown };
const kv = vi.hoisted(() => ({
  rows: new Map<string, unknown>(),
  hydrators: new Map<string, (entries: Entry[]) => void>(),
  persistOk: true,
  deleteOk: true
}));

vi.mock("./storage/pg", () => ({
  registerHydrator: (namespace: string, hydrate: (entries: Entry[]) => void) => {
    kv.hydrators.set(namespace, hydrate);
  },
  kvPersistAwait: async (namespace: string, key: string, value: unknown) => {
    if (!kv.persistOk) return false;
    if (namespace === "billing-web") kv.rows.set(key, JSON.parse(JSON.stringify(value)));
    return true;
  },
  kvDeleteAwait: async (namespace: string, key: string) => {
    if (!kv.deleteOk) return false;
    if (namespace === "billing-web") kv.rows.delete(key);
    return true;
  },
  kvDeleteByValueField: async (namespace: string, field: string, value: string) => {
    if (!kv.deleteOk) return false;
    if (namespace === "billing-web") {
      for (const [key, row] of kv.rows) {
        if ((row as Record<string, unknown>)[field] === value) kv.rows.delete(key);
      }
    }
    return true;
  }
}));

const { clearWebBillingState, getWebGrant, recordWebGrant, revokeWebGrant, revokeWebGrantByPayment } =
  await import("./billing-razorpay");

const grant = (over: Record<string, unknown> = {}) => ({
  product: "pro_annual" as const,
  plan: "pro" as const,
  expiresAt: "2027-10-10T00:00:00.000Z",
  paymentId: "pay_ABC123",
  amountMinor: 499_00,
  currency: "INR",
  grantedAt: "2026-10-10T00:00:00.000Z",
  ...over
});

afterEach(() => {
  clearWebBillingState();
  kv.rows.clear();
  kv.persistOk = true;
  kv.deleteOk = true;
});

/** Boot with exactly these rows in the table, as a restart would find them. */
function hydrate(entries: Entry[]): void {
  clearWebBillingState();
  for (const { key, value } of entries) kv.rows.set(key, value);
  kv.hydrators.get("billing-web")!(entries);
}

describe("what a grant persists as", () => {
  it("stores the receipt — the payment id, and the amount and currency charged", async () => {
    await recordWebGrant("acct_1", grant());
    expect(kv.rows.get("acct_1")).toEqual({
      product: "pro_annual",
      plan: "pro",
      expiresAt: "2027-10-10T00:00:00.000Z",
      paymentId: "pay_ABC123",
      amountMinor: 49900,
      currency: "INR",
      grantedAt: "2026-10-10T00:00:00.000Z"
    });
  });
});

describe("when the database refuses", () => {
  it("does not hold a grant in memory that was never stored", async () => {
    kv.persistOk = false;
    expect(await recordWebGrant("acct_1", grant())).toBe(false);
    // The caller (the webhook route) must then NOT ack: Razorpay retries, and a
    // retry is the only thing that can still save this purchase.
    expect(getWebGrant("acct_1")).toBeUndefined();
    expect(kv.rows.has("acct_1")).toBe(false);
  });

  it("keeps the grant when a revocation is refused, rather than half-revoking it", async () => {
    await recordWebGrant("acct_1", grant());
    kv.deleteOk = false;
    expect(await revokeWebGrant("acct_1")).toBe(false);
    // Memory still agrees with the row that is still there. Dropping it here
    // would make the two disagree, and a restart would bring the grant back.
    expect(getWebGrant("acct_1")).toEqual(grant());
    expect(kv.rows.has("acct_1")).toBe(true);
  });
});

describe("revoking by payment id, which is all a refund gives us", () => {
  it("removes the grant that payment created, from memory and from the table", async () => {
    await recordWebGrant("acct_1", grant());
    expect(await revokeWebGrantByPayment("pay_ABC123")).toBe(true);
    expect(getWebGrant("acct_1")).toBeUndefined();
    expect(kv.rows.has("acct_1")).toBe(false);
  });

  it("leaves a grant from a different payment alone", async () => {
    await recordWebGrant("acct_1", grant());
    await recordWebGrant("acct_2", grant({ paymentId: "pay_OTHER" }));
    await revokeWebGrantByPayment("pay_ABC123");
    expect(getWebGrant("acct_1")).toBeUndefined();
    expect(getWebGrant("acct_2")).toBeDefined();
  });

  it("keeps everything when the database refuses the delete", async () => {
    await recordWebGrant("acct_1", grant());
    kv.deleteOk = false;
    expect(await revokeWebGrantByPayment("pay_ABC123")).toBe(false);
    // The caller must not ack: memory and the table still agree, and the
    // refund will be retried.
    expect(getWebGrant("acct_1")).toEqual(grant());
    expect(kv.rows.has("acct_1")).toBe(true);
  });

  it("succeeds for a payment it has no grant for — there is nothing to undo", async () => {
    expect(await revokeWebGrantByPayment("pay_UNKNOWN")).toBe(true);
  });
});

describe("a restart", () => {
  it("restores a stored grant", () => {
    hydrate([{ key: "acct_1", value: grant() }]);
    expect(getWebGrant("acct_1")).toEqual(grant());
  });

  it("restores an expired grant as it is, so it reads as expired rather than missing", () => {
    const stale = grant({ expiresAt: "2020-01-01T00:00:00.000Z" });
    hydrate([{ key: "acct_1", value: stale }]);
    expect(getWebGrant("acct_1")).toEqual(stale);
  });

  it("skips a row that is not a grant", () => {
    // The hydrator runs over whatever the table holds, including a row written
    // by an older shape or a null left by a failed write.
    hydrate([
      { key: "acct_1", value: null },
      { key: "acct_2", value: { plan: "pro" } },
      { key: "acct_3", value: { paymentId: "pay_1" } },
      { key: "acct_4", value: grant({ paymentId: "pay_OK" }) }
    ]);
    expect(getWebGrant("acct_1")).toBeUndefined();
    expect(getWebGrant("acct_2")).toBeUndefined();
    expect(getWebGrant("acct_3")).toBeUndefined();
    expect(getWebGrant("acct_4")?.paymentId).toBe("pay_OK");
  });
});
