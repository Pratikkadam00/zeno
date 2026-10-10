import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { clearWebBillingState, getWebGrant } from "./billing-razorpay";

/**
 * The Razorpay webhook route. Unlike RevenueCat's, this payload is SIGNED, so
 * the route acts on what it says — which makes the signature, the raw body it
 * is computed over, and the replay guard the whole of the security here.
 */
const SECRET = "whsec-route-test";
const URL = "/api/v1/billing/razorpay/webhook";

const env = { ...process.env };
beforeEach(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
});
afterEach(() => {
  process.env = { ...env };
  clearWebBillingState();
});

const sign = (raw: string, secret = SECRET) => createHmac("sha256", secret).update(raw).digest("hex");

const captured = (over: Record<string, unknown> = {}) => ({
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_ABC123",
        amount: 49900,
        currency: "INR",
        notes: { accountId: "acct_1", product: "pro_annual" },
        ...over
      }
    }
  }
});

/** Post a body exactly as Razorpay would: these bytes, and a signature over them. */
async function post(body: unknown, options: { secret?: string; eventId?: string; signature?: string } = {}) {
  const app = await buildApp();
  const raw = JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const signature = options.signature ?? sign(raw, options.secret ?? SECRET);
  if (signature) headers["x-razorpay-signature"] = signature;
  if (options.eventId) headers["x-razorpay-event-id"] = options.eventId;
  const response = await app.inject({ method: "POST", url: URL, payload: raw, headers });
  await app.close();
  return response;
}

describe("the signature is the authentication", () => {
  it("grants on a correctly signed capture", async () => {
    const response = await post(captured(), { eventId: "evt_1" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ received: true, granted: true });
    const grant = getWebGrant("acct_1");
    expect(grant?.plan).toBe("pro");
    expect(grant?.paymentId).toBe("pay_ABC123");
    expect(grant?.amountMinor).toBe(49900);
    expect(grant?.currency).toBe("INR");
    expect(grant?.expiresAt).not.toBeNull();
  });

  it("refuses a wrong signature, and grants nothing", async () => {
    const response = await post(captured(), { secret: "wrong-secret", eventId: "evt_1" });
    expect(response.statusCode).toBe(401);
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("refuses a missing signature", async () => {
    const response = await post(captured(), { signature: "", eventId: "evt_1" });
    expect(response.statusCode).toBe(401);
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("refuses a body altered after signing — the raw bytes are what is verified", async () => {
    const app = await buildApp();
    const honest = JSON.stringify(captured());
    const tampered = honest.replace('"amount":49900', '"amount":1');
    const response = await app.inject({
      method: "POST",
      url: URL,
      payload: tampered,
      headers: { "content-type": "application/json", "x-razorpay-signature": sign(honest), "x-razorpay-event-id": "evt_1" }
    });
    await app.close();
    expect(response.statusCode).toBe(401);
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("refuses a duplicated signature header, rather than picking one of them", async () => {
    // Two headers of the same name arrive as an array; an implementation that
    // took the first could be fed a valid signature plus a second body's worth
    // of nonsense. Anything that is not a single string is no signature.
    const app = await buildApp();
    const raw = JSON.stringify(captured());
    const response = await app.inject({
      method: "POST",
      url: URL,
      payload: raw,
      headers: { "content-type": "application/json", "x-razorpay-signature": [sign(raw), "second"] as unknown as string }
    });
    await app.close();
    expect(response.statusCode).toBe(401);
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("reports not-configured rather than accepting anything when no secret is set", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const response = await post(captured(), { eventId: "evt_1" });
    expect(response.statusCode).toBe(503);
  });

  it("needs no bearer token — it is a public route authenticated by its signature", async () => {
    // Proof it is not simply unprotected: the same request without a valid
    // signature is refused above.
    const response = await post(captured(), { eventId: "evt_1" });
    expect(response.statusCode).toBe(200);
  });
});

describe("a second delivery of the same event", () => {
  it("is acked without granting twice", async () => {
    await post(captured(), { eventId: "evt_dup" });
    const first = getWebGrant("acct_1")!;
    const again = await post(captured(), { eventId: "evt_dup" });
    expect(again.statusCode).toBe(200);
    expect(again.json().data).toEqual({ received: true, duplicate: true });
    expect(getWebGrant("acct_1")).toEqual(first);
  });

  it("falls back to the event and entity when Razorpay sends no event id", async () => {
    await post(captured());
    const again = await post(captured());
    expect(again.json().data.duplicate).toBe(true);
  });

  it("falls back to the refund's id for a refund with no event id", async () => {
    const refund = { event: "refund.processed", payload: { refund: { entity: { id: "rfnd_7", payment_id: "pay_NONE" } } } };
    expect((await post(refund)).json().data.revoked).toBe(true);
    expect((await post(refund)).json().data.duplicate).toBe(true);
  });

  it("still claims an event that names no entity at all", async () => {
    // An event we neither act on nor recognise, with no id header: it must
    // still get a stable key, or the guard would key everything on "none".
    const first = await post({ event: "subscription.updated", payload: {} });
    expect(first.json().data).toEqual({ received: true });
    expect((await post({ event: "subscription.updated", payload: {} })).json().data.duplicate).toBe(true);
  });
});

describe("what the payload is allowed to decide", () => {
  it("ignores a capture with no account in its notes — not our checkout, nothing to grant", async () => {
    const response = await post(captured({ notes: { product: "pro_annual" } }), { eventId: "evt_2" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ received: true, granted: false });
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("ignores a capture with no product", async () => {
    const response = await post(captured({ notes: { accountId: "acct_1" } }), { eventId: "evt_3" });
    expect(response.json().data).toEqual({ received: true, granted: false });
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("refuses a product that is not one we sell on the web", async () => {
    // pro_monthly is deliberately in-app only (D24): a forged note naming it
    // must not be honoured, and the schema is where that is enforced.
    const response = await post(captured({ notes: { accountId: "acct_1", product: "pro_monthly" } }), { eventId: "evt_4" });
    expect(response.statusCode).toBe(400);
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("grants lifetime with no expiry", async () => {
    await post(captured({ notes: { accountId: "acct_2", product: "pro_lifetime" } }), { eventId: "evt_5" });
    expect(getWebGrant("acct_2")?.expiresAt).toBeNull();
  });

  it("grants the family plan for the family product", async () => {
    await post(captured({ notes: { accountId: "acct_3", product: "family_annual" } }), { eventId: "evt_6" });
    expect(getWebGrant("acct_3")?.plan).toBe("family");
  });

  it("acks an event it does not act on", async () => {
    const response = await post({ event: "payment.failed", payload: { payment: { entity: { id: "pay_X", amount: 1, currency: "INR" } } } }, { eventId: "evt_7" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ received: true });
  });

  it("rejects a body that is not a Razorpay event at all", async () => {
    const response = await post({ nope: true }, { eventId: "evt_8" });
    expect(response.statusCode).toBe(400);
  });
});

describe("refunds", () => {
  it("revokes the grant the refunded payment created", async () => {
    await post(captured(), { eventId: "evt_pay" });
    expect(getWebGrant("acct_1")).toBeDefined();
    const response = await post({
      event: "refund.processed",
      payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_ABC123" } } }
    }, { eventId: "evt_refund" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ received: true, revoked: true });
    expect(getWebGrant("acct_1")).toBeUndefined();
  });

  it("leaves other buyers alone", async () => {
    await post(captured(), { eventId: "evt_pay" });
    await post(captured({ id: "pay_OTHER", notes: { accountId: "acct_9", product: "pro_annual" } }), { eventId: "evt_pay_2" });
    await post({
      event: "refund.processed",
      payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_ABC123" } } }
    }, { eventId: "evt_refund" });
    expect(getWebGrant("acct_1")).toBeUndefined();
    expect(getWebGrant("acct_9")).toBeDefined();
  });

  it("acks a refund for a payment it has no grant for", async () => {
    const response = await post({
      event: "refund.processed",
      payload: { refund: { entity: { id: "rfnd_2", payment_id: "pay_UNKNOWN" } } }
    }, { eventId: "evt_refund_2" });
    expect(response.statusCode).toBe(200);
  });
});
