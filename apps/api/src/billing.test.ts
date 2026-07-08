import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyWebhookEvent, clearEntitlementCache, getCachedEntitlement, planFromEntitlements, verifyWebhookAuth } from "./billing";

afterEach(() => clearEntitlementCache());

describe("verifyWebhookAuth", () => {
  const originalSecret = process.env.REVENUECAT_WEBHOOK_AUTH;

  beforeEach(() => {
    process.env.REVENUECAT_WEBHOOK_AUTH = "correct-shared-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH;
    else process.env.REVENUECAT_WEBHOOK_AUTH = originalSecret;
  });

  it("accepts the correct secret with a Bearer prefix", () => {
    expect(verifyWebhookAuth("Bearer correct-shared-secret")).toBe(true);
  });

  it("accepts the correct secret with no Bearer prefix", () => {
    expect(verifyWebhookAuth("correct-shared-secret")).toBe(true);
  });

  it("rejects a same-length but wrong secret (exercises the timingSafeEqual branch, not just the length short-circuit)", () => {
    expect(verifyWebhookAuth("Bearer wrong-shared-secre1")).toBe(false);
  });

  it("rejects a shorter or longer secret without throwing", () => {
    expect(verifyWebhookAuth("Bearer short")).toBe(false);
    expect(verifyWebhookAuth("Bearer correct-shared-secret-with-extra-suffix")).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    expect(verifyWebhookAuth(undefined)).toBe(false);
  });

  it("rejects an empty Authorization header", () => {
    expect(verifyWebhookAuth("")).toBe(false);
  });

  it("fails closed when REVENUECAT_WEBHOOK_AUTH is not configured, even given a matching-looking header", () => {
    delete process.env.REVENUECAT_WEBHOOK_AUTH;
    expect(verifyWebhookAuth("Bearer correct-shared-secret")).toBe(false);
  });
});

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
