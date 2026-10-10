import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Entitlement } from "./billing";
import {
  betterEntitlement,
  claimEvent,
  clearWebBillingState,
  entitlementFromWebGrant,
  getWebGrant,
  grantWindow,
  isWebGrantActive,
  razorpayConfigured,
  razorpayWebhookConfigured,
  recordWebGrant,
  revokeWebGrant,
  verifyRazorpaySignature,
  type WebGrant,
  type WebProduct
} from "./billing-razorpay";

const SECRET = "whsec-test-secret";
const PREVIOUS = "whsec-previous-secret";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  clearWebBillingState();
});

/** Razorpay's own signing: HMAC-SHA256 over the raw body, hex, with the secret. */
const sign = (rawBody: string, secret = SECRET) => createHmac("sha256", secret).update(rawBody).digest("hex");

const grant = (over: Partial<WebGrant> = {}): WebGrant => ({
  product: "pro_annual",
  plan: "pro",
  expiresAt: "2027-10-10T00:00:00.000Z",
  paymentId: "pay_ABC123",
  amountMinor: 499_00,
  currency: "INR",
  grantedAt: "2026-10-10T00:00:00.000Z",
  ...over
});

const ent = (over: Partial<Entitlement> = {}): Entitlement => ({
  plan: "pro",
  active: true,
  expiresAt: "2027-01-01T00:00:00.000Z",
  source: "revenuecat",
  ...over
});

describe("verifyRazorpaySignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS;
  });

  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });

  it("accepts the signature Razorpay would send", () => {
    expect(verifyRazorpaySignature(body, sign(body))).toBe(true);
  });

  it("refuses a signature made with the wrong secret", () => {
    expect(verifyRazorpaySignature(body, sign(body, "not-the-secret"))).toBe(false);
  });

  it("refuses a body that changed after signing", () => {
    const signature = sign(body);
    const tampered = body.replace("pay_1", "pay_2");
    expect(verifyRazorpaySignature(tampered, signature)).toBe(false);
  });

  it("refuses a re-serialised body — which is why the raw bytes are what gets verified", () => {
    // Razorpay's docs say not to parse or cast the body first. A sender's own
    // formatting is not JSON.stringify's: here the body arrives pretty-printed,
    // and parsing then re-stringifying it keeps every VALUE while changing the
    // bytes — so the digest changes. Proof that a route must hand us the raw
    // body rather than Fastify's parsed object.
    const raw = '{\n  "event": "payment.captured",\n  "contains": ["payment"]\n}';
    const reserialised = JSON.stringify(JSON.parse(raw));
    expect(reserialised).not.toBe(raw);
    expect(verifyRazorpaySignature(raw, sign(raw))).toBe(true);
    expect(verifyRazorpaySignature(reserialised, sign(raw))).toBe(false);
  });

  it("refuses when there is no body to verify", () => {
    // The route passes whatever its raw-body hook captured; nothing captured is
    // not an empty body that happens to match a signature of "".
    expect(verifyRazorpaySignature(undefined, sign(""))).toBe(false);
    expect(verifyRazorpaySignature("", sign(""))).toBe(true);
  });

  it("refuses a missing header, and refuses everything when no secret is set", () => {
    expect(verifyRazorpaySignature(body, undefined)).toBe(false);
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(verifyRazorpaySignature(body, sign(body))).toBe(false);
  });

  it("refuses an empty secret rather than treating it as configured", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "";
    expect(razorpayWebhookConfigured()).toBe(false);
    expect(verifyRazorpaySignature(body, sign(body, ""))).toBe(false);
  });

  it("accepts the previous secret during a rotation, and both at once", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS = PREVIOUS;
    expect(verifyRazorpaySignature(body, sign(body, PREVIOUS))).toBe(true);
    expect(verifyRazorpaySignature(body, sign(body, SECRET))).toBe(true);
    expect(verifyRazorpaySignature(body, sign(body, "third-secret"))).toBe(false);
  });

  it("does not throw on a header of the wrong length or shape", () => {
    // timingSafeEqual throws on unequal lengths, which is why both sides are
    // hashed to a fixed width before comparison.
    expect(verifyRazorpaySignature(body, "short")).toBe(false);
    expect(verifyRazorpaySignature(body, "z".repeat(200))).toBe(false);
  });
});

describe("razorpayConfigured", () => {
  it("needs both halves of the key pair", () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(razorpayConfigured()).toBe(false);
    process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
    expect(razorpayConfigured()).toBe(false);
    process.env.RAZORPAY_KEY_SECRET = "secret";
    expect(razorpayConfigured()).toBe(true);
  });
});

describe("grantWindow", () => {
  it("gives an annual purchase one calendar year in UTC", () => {
    const { plan, expiresAt } = grantWindow("pro_annual", Date.parse("2026-10-10T08:30:00.000Z"));
    expect(plan).toBe("pro");
    expect(expiresAt).toBe("2027-10-10T08:30:00.000Z");
  });

  it("crosses a leap day without losing one — a year, not 365 days", () => {
    // 2028 is a leap year: 365 days from this date would land on 2027-02-28.
    expect(grantWindow("pro_annual", Date.parse("2027-03-01T00:00:00.000Z")).expiresAt)
      .toBe("2028-03-01T00:00:00.000Z");
    // Bought ON a leap day, the year lands on 1 March — a day in the buyer's favour.
    expect(grantWindow("pro_annual", Date.parse("2028-02-29T00:00:00.000Z")).expiresAt)
      .toBe("2029-03-01T00:00:00.000Z");
  });

  it("never expires a lifetime purchase", () => {
    expect(grantWindow("pro_lifetime", Date.now())).toEqual({ plan: "pro", expiresAt: null });
  });

  it("maps the family product to the family plan", () => {
    expect(grantWindow("family_annual", Date.now()).plan).toBe("family");
  });
});

describe("entitlementFromWebGrant", () => {
  const nowMs = Date.parse("2026-10-10T00:00:00.000Z");

  it("reads a live grant as its plan", () => {
    expect(entitlementFromWebGrant(grant(), nowMs)).toEqual({
      plan: "pro",
      active: true,
      expiresAt: "2027-10-10T00:00:00.000Z",
      source: "razorpay"
    });
  });

  it("reads an expired grant as free, and does not keep its expiry", () => {
    const expired = entitlementFromWebGrant(grant({ expiresAt: "2026-10-09T23:59:59.000Z" }), nowMs);
    expect(expired).toEqual({ plan: "free", active: false, expiresAt: null, source: "razorpay" });
  });

  it("treats the expiry instant itself as over", () => {
    expect(isWebGrantActive(grant({ expiresAt: new Date(nowMs).toISOString() }), nowMs)).toBe(false);
  });

  it("keeps a lifetime grant active", () => {
    expect(isWebGrantActive(grant({ product: "pro_lifetime", expiresAt: null }), nowMs)).toBe(true);
  });
});

describe("betterEntitlement", () => {
  const free: Entitlement = { plan: "free", active: false, expiresAt: null, source: "unconfigured" };

  it("prefers the active one over an inactive one, whichever side it is on", () => {
    expect(betterEntitlement(free, ent())).toEqual(ent());
    expect(betterEntitlement(ent(), free)).toEqual(ent());
  });

  it("prefers the higher plan", () => {
    const family = ent({ plan: "family", source: "razorpay" });
    expect(betterEntitlement(ent(), family)).toEqual(family);
    expect(betterEntitlement(family, ent())).toEqual(family);
  });

  it("prefers lifetime over any dated grant of the same plan", () => {
    const lifetime = ent({ expiresAt: null, source: "razorpay" });
    expect(betterEntitlement(ent({ expiresAt: "2099-01-01T00:00:00.000Z" }), lifetime)).toEqual(lifetime);
    expect(betterEntitlement(lifetime, ent({ expiresAt: "2099-01-01T00:00:00.000Z" }))).toEqual(lifetime);
  });

  it("prefers the later expiry when the plans match", () => {
    const later = ent({ expiresAt: "2028-01-01T00:00:00.000Z", source: "razorpay" });
    expect(betterEntitlement(ent(), later)).toEqual(later);
    expect(betterEntitlement(later, ent())).toEqual(later);
  });

  it("does not downgrade the buyer who holds both — the case this function exists for", () => {
    // Monthly Pro through Play, then lifetime bought on the website.
    const play = ent({ expiresAt: "2026-11-10T00:00:00.000Z" });
    const web = entitlementFromWebGrant(grant({ product: "pro_lifetime", expiresAt: null }));
    expect(betterEntitlement(play, web).expiresAt).toBeNull();
    // And the reverse: a lapsed web grant must not hide a live Play purchase.
    const lapsed = entitlementFromWebGrant(grant({ expiresAt: "2026-01-01T00:00:00.000Z" }));
    expect(betterEntitlement(lapsed, play)).toEqual(play);
  });

  it("returns free when neither side is active", () => {
    expect(betterEntitlement(free, free).active).toBe(false);
  });
});

describe("recordWebGrant / revokeWebGrant", () => {
  it("stores a grant and reads it back", async () => {
    expect(await recordWebGrant("acct_1", grant())).toBe(true);
    expect(getWebGrant("acct_1")).toEqual(grant());
  });

  it("replaces a grant when a buyer upgrades", async () => {
    await recordWebGrant("acct_1", grant());
    const lifetime = grant({ product: "pro_lifetime", expiresAt: null, paymentId: "pay_XYZ" });
    await recordWebGrant("acct_1", lifetime);
    expect(getWebGrant("acct_1")).toEqual(lifetime);
  });

  it("revokes on a refund, so a refunded buyer does not keep the plan", async () => {
    await recordWebGrant("acct_1", grant());
    expect(await revokeWebGrant("acct_1")).toBe(true);
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("keeps accounts separate", async () => {
    await recordWebGrant("acct_1", grant());
    expect(getWebGrant("acct_2")).toBeUndefined();
  });
});

describe("claimEvent", () => {
  it("claims an id once", () => {
    expect(claimEvent("evt_1")).toBe(true);
    expect(claimEvent("evt_1")).toBe(false);
  });

  it("lets a different event through", () => {
    expect(claimEvent("evt_1")).toBe(true);
    expect(claimEvent("evt_2")).toBe(true);
  });

  it("forgets an id once it is older than the retry window", () => {
    const t0 = Date.parse("2026-10-10T00:00:00.000Z");
    expect(claimEvent("evt_1", t0)).toBe(true);
    // Still remembered a day later: a re-delivery must not grant twice.
    expect(claimEvent("evt_1", t0 + 24 * 60 * 60 * 1000)).toBe(false);
    // Forgotten after the window, which bounds how much is kept.
    expect(claimEvent("evt_1", t0 + 8 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it("stays bounded under a flood, and keeps the newest ids", () => {
    const t0 = Date.parse("2026-10-10T00:00:00.000Z");
    for (let i = 0; i < 6_000; i += 1) {
      expect(claimEvent(`evt_${i}`, t0 + i)).toBe(true);
    }
    // The newest is still remembered; the oldest has been evicted, which is the
    // trade this cap makes deliberately.
    expect(claimEvent("evt_5999", t0 + 6_000)).toBe(false);
    expect(claimEvent("evt_0", t0 + 6_000)).toBe(true);
  });
});

describe("the products the website sells", () => {
  it("has no monthly product — monthly stays in the app, on Play billing", () => {
    const products: WebProduct[] = ["pro_annual", "pro_lifetime", "family_annual"];
    for (const product of products) {
      expect(product).not.toContain("monthly");
    }
    // @ts-expect-error pro_monthly is deliberately not a web product (D24).
    const notAProduct: WebProduct = "pro_monthly";
    expect(notAProduct).toBe("pro_monthly");
  });
});
