import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

/**
 * The same-origin route /pro reads its prices from. It exists so the browser
 * never calls the Zeno API directly: the site keeps `connect-src 'self'` and
 * the API's address stays a server detail.
 */
const get = (query = "") => new Request(`http://localhost/api/checkout/prices${query}`);
const apiSays = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), { status, headers: { "content-type": "application/json" } });

const PRICED = { currency: "INR", configured: true, products: [{ product: "pro_annual", plan: "pro", amountMinor: 49900 }] };

afterEach(() => vi.restoreAllMocks());

describe("GET /api/checkout/prices", () => {
  it("passes on what the API offers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiSays(PRICED));
    const response = await GET(get());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(PRICED);
  });

  it("asks the API for the currency the page asked for", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiSays({ currency: "USD", configured: true, products: [] }));
    await GET(get("?currency=USD"));
    expect(String(spy.mock.calls[0]?.[0])).toContain("currency=USD");
  });

  it("ignores a currency it does not sell in", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiSays(PRICED));
    await GET(get("?currency=JPY"));
    expect(String(spy.mock.calls[0]?.[0])).toContain("currency=INR");
  });

  it("says nothing is for sale when the API cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    const response = await GET(get());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ currency: "INR", configured: false, products: [] });
  });

  it("is never cached, so a price change takes effect at once", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiSays(PRICED));
    expect((await GET(get())).headers.get("cache-control")).toBe("no-store");
  });

  it("does not pass on a product the website does not sell", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiSays({
      currency: "INR",
      configured: true,
      products: [{ product: "pro_monthly", plan: "pro", amountMinor: 9900 }]
    }));
    expect((await (await GET(get())).json()).products).toEqual([]);
  });
});
