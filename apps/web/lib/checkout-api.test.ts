import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_PRICES, apiBaseUrl, fetchPrices, formatPrice, parsePriceList, productName } from "./checkout-api";

/**
 * The website's view of what may be sold (D24). The rule behind every case
 * here: a checkout that cannot quote a price must not guess one, so anything
 * unexpected reads as "nothing for sale" rather than as a default.
 */
const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
  vi.restoreAllMocks();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const priced = { product: "pro_annual", plan: "pro", amountMinor: 49900 };

describe("apiBaseUrl", () => {
  it("uses the configured API when one is set, without a trailing slash", () => {
    process.env.API_BASE_URL = "https://api.example.test/api/v1///";
    expect(apiBaseUrl()).toBe("https://api.example.test/api/v1");
  });

  it("falls back to the deployed API when the variable is unset or blank", () => {
    delete process.env.API_BASE_URL;
    expect(apiBaseUrl()).toMatch(/^https:\/\/.+\/api\/v1$/);
    process.env.API_BASE_URL = "   ";
    expect(apiBaseUrl()).toMatch(/^https:\/\/.+\/api\/v1$/);
  });
});

describe("parsePriceList", () => {
  it("reads a well-formed list", () => {
    expect(parsePriceList({ currency: "INR", configured: true, products: [priced] })).toEqual({
      currency: "INR",
      configured: true,
      products: [priced]
    });
  });

  it("treats anything that is not an object as nothing for sale", () => {
    for (const bad of [null, undefined, 42, "prices", []]) expect(parsePriceList(bad)).toEqual(NO_PRICES);
  });

  it("refuses a currency it does not know", () => {
    expect(parsePriceList({ currency: "JPY", configured: true, products: [priced] })).toEqual(NO_PRICES);
  });

  it("refuses a products field that is not a list", () => {
    expect(parsePriceList({ currency: "INR", configured: true, products: { pro_annual: 49900 } })).toEqual(NO_PRICES);
  });

  it("drops an entry that is not a sellable product at a real price, and keeps the rest", () => {
    const result = parsePriceList({
      currency: "INR",
      configured: true,
      products: [
        null,
        "pro_annual",
        { product: "pro_monthly", plan: "pro", amountMinor: 49900 }, // in-app only (D24)
        { product: "pro_annual", plan: "enterprise", amountMinor: 49900 },
        { product: "pro_annual", plan: "pro", amountMinor: "49900" },
        { product: "pro_annual", plan: "pro", amountMinor: 499.5 },
        { product: "pro_annual", plan: "pro", amountMinor: 0 },
        { product: "pro_annual", plan: "pro", amountMinor: -49900 },
        { product: "pro_lifetime", plan: "pro", amountMinor: 999900 }
      ]
    });
    expect(result.products).toEqual([{ product: "pro_lifetime", plan: "pro", amountMinor: 999900 }]);
  });

  it("reads configured as false unless it is exactly true", () => {
    expect(parsePriceList({ currency: "INR", configured: "yes", products: [] }).configured).toBe(false);
  });
});

describe("fetchPrices", () => {
  it("asks the API for the currency wanted", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ data: { currency: "USD", configured: true, products: [] } }));
    const result = await fetchPrices("USD");
    expect(String(spy.mock.calls[0]?.[0])).toContain("/billing/razorpay/prices?currency=USD");
    expect(result.currency).toBe("USD");
  });

  it("offers nothing when the API says no", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ error: "nope" }, 503));
    expect(await fetchPrices()).toEqual(NO_PRICES);
  });

  it("offers nothing when the API is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect(await fetchPrices()).toEqual(NO_PRICES);
  });

  it("offers nothing when the body is not what we expect", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<html>502</html>", { status: 200 }));
    expect(await fetchPrices()).toEqual(NO_PRICES);
  });

  it("gives up rather than holding the page open", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce((_url, init) =>
      new Promise((_resolve, reject) => {
        (init as RequestInit).signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
    );
    expect(await fetchPrices("INR", 5)).toEqual(NO_PRICES);
  });
});

describe("formatPrice", () => {
  it("never rounds a price away", () => {
    expect(formatPrice(49900, "INR")).toBe("₹499.00");
    expect(formatPrice(49999, "INR")).toBe("₹499.99");
    expect(formatPrice(1, "INR")).toBe("₹0.01");
  });

  it("uses the right symbol", () => {
    expect(formatPrice(2999, "USD")).toBe("$29.99");
  });
});

describe("productName", () => {
  it("names each product the way the page shows it", () => {
    expect(productName("pro_annual")).toBe("Pro, one year");
    expect(productName("pro_lifetime")).toBe("Pro, lifetime");
    expect(productName("family_annual")).toBe("Family, one year");
  });
});
