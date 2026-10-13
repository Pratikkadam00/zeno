import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import { createOrder, priceEnvName, priceFor } from "./billing-razorpay";

/**
 * Creating the order the browser's checkout runs against.
 *
 * Two things matter here and nothing else does: the amount is ours, not the
 * buyer's, and the account the payment will be credited to is read from the
 * token rather than the body. Everything below is one of those two.
 */
const env = { ...process.env };
beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_key";
  process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
  process.env.RAZORPAY_PRICE_PRO_ANNUAL_INR = "49900";
});
afterEach(() => {
  process.env = { ...env };
  vi.restoreAllMocks();
});

/** A real signed-in account: the magic link, followed the way a browser would
 *  (the dev link carries the token), as schema-valid.test.ts does. */
async function signedIn(app: Awaited<ReturnType<typeof buildApp>>) {
  const email = `order-${Math.random().toString(36).slice(2)}@zeno.test`;
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const token = decodeURIComponent(String(requested.json().data.devLink).split("token=")[1]!);
  const verified = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token } });
  return { authorization: `Bearer ${verified.json().data.accessToken as string}` };
}

const orderResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("prices are configuration, and unusable ones are refused", () => {
  it("names the variable it expects", () => {
    expect(priceEnvName("pro_annual", "INR")).toBe("RAZORPAY_PRICE_PRO_ANNUAL_INR");
    expect(priceEnvName("pro_lifetime", "USD")).toBe("RAZORPAY_PRICE_PRO_LIFETIME_USD");
    expect(priceEnvName("family_annual", "INR")).toBe("RAZORPAY_PRICE_FAMILY_ANNUAL_INR");
  });

  it("reads a configured price in minor units", () => {
    expect(priceFor("pro_annual", "INR")).toEqual({ amountMinor: 49900 });
  });

  it("refuses an unset price rather than defaulting to one", () => {
    expect(priceFor("pro_lifetime", "INR")).toEqual({ error: "RAZORPAY_PRICE_PRO_LIFETIME_INR is not set" });
  });

  it("refuses a blank price", () => {
    process.env.RAZORPAY_PRICE_PRO_ANNUAL_INR = "   ";
    expect(priceFor("pro_annual", "INR")).toHaveProperty("error");
  });

  it("refuses a price that is not a whole number of minor units", () => {
    for (const bad of ["499.00", "4,990", "₹499", "-100", "1e5"]) {
      process.env.RAZORPAY_PRICE_PRO_ANNUAL_INR = bad;
      expect(priceFor("pro_annual", "INR"), bad).toHaveProperty("error");
    }
  });

  it("refuses the rupees-for-paise mistake", () => {
    // "499" meaning ₹499 is 499 paise: ₹4.99, a hundredfold undercharge that
    // nothing downstream could notice. The floor is what catches it.
    process.env.RAZORPAY_PRICE_PRO_ANNUAL_INR = "499";
    const result = priceFor("pro_annual", "INR");
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("paise or cents");
  });

  it("accepts a real price just above the floor, in both currencies", () => {
    process.env.RAZORPAY_PRICE_PRO_ANNUAL_INR = "10000"; // ₹100
    expect(priceFor("pro_annual", "INR")).toEqual({ amountMinor: 10000 });
    process.env.RAZORPAY_PRICE_PRO_ANNUAL_USD = "300"; // $3
    expect(priceFor("pro_annual", "USD")).toEqual({ amountMinor: 300 });
    // And the same mistake in dollars: "29" meaning $29 is 29 cents.
    process.env.RAZORPAY_PRICE_PRO_ANNUAL_USD = "29";
    expect(priceFor("pro_annual", "USD")).toHaveProperty("error");
  });

  it("does not quote the configured value back in the error", () => {
    process.env.RAZORPAY_PRICE_PRO_ANNUAL_INR = "secret-looking-nonsense";
    const result = priceFor("pro_annual", "INR") as { error: string };
    expect(result.error).toContain("RAZORPAY_PRICE_PRO_ANNUAL_INR");
    expect(result.error).not.toContain("secret-looking-nonsense");
  });
});

describe("createOrder", () => {
  it("sends our amount, and the account and product as notes", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_123", amount: 49900, currency: "INR" }));
    const order = await createOrder("acct_1", "pro_annual", "INR");
    expect(order).toEqual({ orderId: "order_123", amountMinor: 49900, currency: "INR", keyId: "rzp_test_key" });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    const body = JSON.parse(init.body as string);
    expect(body.amount).toBe(49900);
    expect(body.currency).toBe("INR");
    expect(body.notes).toEqual({ accountId: "acct_1", product: "pro_annual", immediateAccess: "no" });
    // Razorpay caps the receipt at 40 characters.
    expect(body.receipt.length).toBeLessThanOrEqual(40);
  });

  it("authenticates with HTTP Basic, and puts the secret nowhere else", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_123" }));
    await createOrder("acct_1", "pro_annual", "INR");
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("rzp_test_key:rzp_test_secret").toString("base64")}`);
    expect(init.body as string).not.toContain("rzp_test_secret");
  });

  it("keeps our amount even if the echo disagrees", async () => {
    // If Razorpay ever echoed a different amount, charging what we decided is
    // the only defensible answer — and the mismatch must not reach the buyer
    // as a changed price.
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_123", amount: 1, currency: "INR" }));
    expect((await createOrder("acct_1", "pro_annual", "INR")).amountMinor).toBe(49900);
  });

  it("refuses to call Razorpay at all without a configured price", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(createOrder("acct_1", "pro_lifetime", "INR")).rejects.toThrow("RAZORPAY_PRICE_PRO_LIFETIME_INR is not set");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses without keys", async () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    await expect(createOrder("acct_1", "pro_annual", "INR")).rejects.toThrow("not configured");
  });

  it("surfaces the status, not the body, when Razorpay refuses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ error: { description: "whatever we sent back" } }, 400));
    await expect(createOrder("acct_1", "pro_annual", "INR")).rejects.toThrow("Razorpay responded 400");
  });

  it("rejects a 200 with no order id rather than returning a broken order", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ amount: 49900 }));
    await expect(createOrder("acct_1", "pro_annual", "INR")).rejects.toThrow("no id");
  });
});

describe("the route", () => {
  it("creates an order for the account in the token, not one in the body", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_abc", amount: 49900 }));
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/billing/razorpay/order",
      headers,
      payload: { product: "pro_annual", currency: "INR", accountId: "acct_someone_else" }
    });
    await app.close();
    expect(response.statusCode).toBe(200);
    expect(response.json().data.orderId).toBe("order_abc");
    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.notes.accountId).not.toBe("acct_someone_else");
    expect(body.notes.accountId).toMatch(/^acct_/);
  });

  it("defaults to INR when no currency is given", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_abc" }));
    await app.inject({ method: "POST", url: "/api/v1/billing/razorpay/order", headers, payload: { product: "pro_annual" } });
    await app.close();
    expect(JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string).currency).toBe("INR");
  });

  it("says a product is unavailable in a currency it has no price in, without calling Razorpay", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await app.inject({
      method: "POST", url: "/api/v1/billing/razorpay/order", headers, payload: { product: "pro_annual", currency: "USD" }
    });
    await app.close();
    expect(response.statusCode).toBe(503);
    expect(response.json().error.message).toBe("pro_annual is not available in USD.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not leak which variable is missing to the browser", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    const response = await app.inject({
      method: "POST", url: "/api/v1/billing/razorpay/order", headers, payload: { product: "pro_lifetime" }
    });
    await app.close();
    expect(response.json().error.message).not.toContain("RAZORPAY_PRICE");
  });

  it("reports not-configured when the server has no keys", async () => {
    delete process.env.RAZORPAY_KEY_ID;
    const app = await buildApp();
    const headers = await signedIn(app);
    const response = await app.inject({
      method: "POST", url: "/api/v1/billing/razorpay/order", headers, payload: { product: "pro_annual" }
    });
    await app.close();
    expect(response.statusCode).toBe(503);
  });

  it("rejects a product the website does not sell", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    const response = await app.inject({
      method: "POST", url: "/api/v1/billing/razorpay/order", headers, payload: { product: "pro_monthly" }
    });
    await app.close();
    expect(response.statusCode).toBe(400);
  });

  it("needs a token", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST", url: "/api/v1/billing/razorpay/order", payload: { product: "pro_annual" }
    });
    await app.close();
    expect(response.statusCode).toBe(401);
  });

  it("turns an upstream failure into a 502, not a 500", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));
    const response = await app.inject({
      method: "POST", url: "/api/v1/billing/razorpay/order", headers, payload: { product: "pro_annual" }
    });
    await app.close();
    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("UPSTREAM_ERROR");
  });
});

describe("the price list the website renders from", () => {
  it("offers only what is priced, so an unset product is simply not for sale", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/billing/razorpay/prices" });
    await app.close();
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      currency: "INR",
      configured: true,
      products: [{ product: "pro_annual", plan: "pro", amountMinor: 49900 }]
    });
  });

  it("returns an empty list rather than a placeholder price", async () => {
    delete process.env.RAZORPAY_PRICE_PRO_ANNUAL_INR;
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/billing/razorpay/prices" });
    await app.close();
    expect(response.json().data.products).toEqual([]);
  });

  it("reads the currency asked for, and treats anything else as INR", async () => {
    process.env.RAZORPAY_PRICE_PRO_LIFETIME_USD = "9900";
    const app = await buildApp();
    const usd = await app.inject({ method: "GET", url: "/api/v1/billing/razorpay/prices?currency=USD" });
    const odd = await app.inject({ method: "GET", url: "/api/v1/billing/razorpay/prices?currency=JPY" });
    await app.close();
    expect(usd.json().data).toEqual({
      currency: "USD",
      configured: true,
      products: [{ product: "pro_lifetime", plan: "pro", amountMinor: 9900 }]
    });
    expect(odd.json().data.currency).toBe("INR");
  });

  it("says when the server has no keys at all, so the page can stay quiet", async () => {
    delete process.env.RAZORPAY_KEY_ID;
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/billing/razorpay/prices" });
    await app.close();
    expect(response.json().data.configured).toBe(false);
  });

  it("needs no token", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/billing/razorpay/prices" });
    await app.close();
    expect(response.statusCode).toBe(200);
  });

  it("never exposes the key secret", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/billing/razorpay/prices" });
    await app.close();
    expect(response.body).not.toContain("rzp_test_secret");
  });
});

describe("the EU/UK consent to immediate access", () => {
  it("is carried on the order as our own note", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_1" }));
    await createOrder("acct_1", "pro_annual", "INR", true);
    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.notes.immediateAccess).toBe("yes");
  });

  it("records 'no' when it was not given, rather than leaving it out", async () => {
    // Absent would be ambiguous later; "no" is a statement.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_1" }));
    await createOrder("acct_1", "pro_annual", "INR");
    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.notes.immediateAccess).toBe("no");
  });

  it("defaults to not given when the browser does not say", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_1" }));
    await app.inject({ method: "POST", url: "/api/v1/billing/razorpay/order", headers, payload: { product: "pro_annual" } });
    await app.close();
    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.notes.immediateAccess).toBe("no");
  });

  it("passes on what the buyer actually ticked", async () => {
    const app = await buildApp();
    const headers = await signedIn(app);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(orderResponse({ id: "order_1" }));
    await app.inject({
      method: "POST", url: "/api/v1/billing/razorpay/order", headers,
      payload: { product: "pro_annual", acceptedImmediateAccess: true }
    });
    await app.close();
    const body = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.notes.immediateAccess).toBe("yes");
  });
});
