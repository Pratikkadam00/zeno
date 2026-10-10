import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What the webhook route does when the grant cannot be made durable.
 *
 * This is the branch that decides whether a paying customer ends up on the free
 * plan. Razorpay retries a non-2xx; it does not retry a 200. So the route must
 * NOT ack when the write failed — the retry is the only thing left that can
 * still deliver what the buyer paid for.
 */
vi.mock("./billing-razorpay", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./billing-razorpay")>()),
  recordWebGrant: async () => false,
  revokeWebGrantByPayment: async () => false
}));

const { buildApp } = await import("./app");

const SECRET = "whsec-failure-test";
const URL = "/api/v1/billing/razorpay/webhook";
const env = { ...process.env };

beforeEach(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
});
afterEach(() => {
  process.env = { ...env };
});

async function post(body: unknown, eventId: string) {
  const app = await buildApp();
  const raw = JSON.stringify(body);
  const response = await app.inject({
    method: "POST",
    url: URL,
    payload: raw,
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": createHmac("sha256", SECRET).update(raw).digest("hex"),
      "x-razorpay-event-id": eventId
    }
  });
  await app.close();
  return response;
}

describe("when the grant cannot be stored", () => {
  it("does not ack a capture, so Razorpay retries", async () => {
    const response = await post({
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_1", amount: 49900, currency: "INR", notes: { accountId: "acct_1", product: "pro_annual" } }
        }
      }
    }, "evt_capture_fail");
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("does not ack a refund either — an unrecorded refund leaves Pro granted", async () => {
    const response = await post({
      event: "refund.processed",
      payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_1" } } }
    }, "evt_refund_fail");
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
