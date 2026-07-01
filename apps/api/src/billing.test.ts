import { afterEach, describe, expect, it } from "vitest";
import { applyWebhookEvent, clearEntitlementCache, getCachedEntitlement } from "./billing";

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
