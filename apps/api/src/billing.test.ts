import { afterEach, describe, expect, it } from "vitest";
import { applyWebhookEvent, clearEntitlementCache, getCachedEntitlement, planFromEntitlements } from "./billing";

afterEach(() => clearEntitlementCache());

describe("entitlement cache expiry", () => {
  it("does not serve an active grant past its own expiresAt (missed downgrade webhook)", () => {
    applyWebhookEvent({ event: { app_user_id: "u1", type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: Date.now() - 1000 } });
    expect(getCachedEntitlement("u1")).toBeUndefined();
  });

  it("serves an active grant that has not yet expired", () => {
    applyWebhookEvent({ event: { app_user_id: "u2", type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: Date.now() + 60_000 } });
    const entitlement = getCachedEntitlement("u2");
    expect(entitlement?.plan).toBe("pro");
    expect(entitlement?.active).toBe(true);
  });

  it("serves a downgrade result (free/inactive) even with a past expiry", () => {
    applyWebhookEvent({ event: { app_user_id: "u3", type: "EXPIRATION", entitlement_ids: ["pro"], expiration_at_ms: Date.now() - 1000 } });
    const entitlement = getCachedEntitlement("u3");
    expect(entitlement?.plan).toBe("free");
    expect(entitlement?.active).toBe(false);
  });
});

// A lifetime (non-consumable) purchase attached to the "pro" entitlement in the
// RevenueCat dashboard reports expires_date: null (RevenueCat's documented
// convention for lifetime access) — never a downgrade webhook, since a
// non-consumable never expires or renews. This locks in that this server path
// already handles it correctly with no lifetime-specific code.
describe("lifetime (non-consumable) entitlements — expires_date: null", () => {
  it("planFromEntitlements treats a null expires_date as active forever", () => {
    const result = planFromEntitlements({ pro: { expires_date: null } });
    expect(result).toEqual({ plan: "pro", active: true, expiresAt: null });
  });

  it("an INITIAL_PURCHASE webhook with no expiration_at_ms (lifetime) caches an active, never-expiring grant", () => {
    applyWebhookEvent({ event: { app_user_id: "u-lifetime", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } });
    const entitlement = getCachedEntitlement("u-lifetime");
    expect(entitlement).toMatchObject({ plan: "pro", active: true, expiresAt: null });
  });
});
