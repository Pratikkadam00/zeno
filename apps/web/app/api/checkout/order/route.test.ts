import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/**
 * Starting a purchase. The browser chooses a product and ticks a box; the
 * amount and the account are the API's business, and this route's job is to
 * forward the token and refuse anything else.
 */
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/checkout/order", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });

const BEARER = { authorization: "Bearer access-token-value" };
const apiOk = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });
const ORDER = { orderId: "order_1", amountMinor: 49900, currency: "INR", keyId: "rzp_test_key" };

afterEach(() => vi.restoreAllMocks());

describe("POST /api/checkout/order", () => {
  it("forwards the product, the currency and the token, and returns the order", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk(ORDER));
    const response = await POST(post({ product: "pro_annual", currency: "INR" }, BEARER));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(ORDER);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/billing/razorpay/order");
    expect((init.headers as Record<string, string>).authorization).toBe(BEARER.authorization);
    expect(JSON.parse(init.body as string)).toEqual({ product: "pro_annual", currency: "INR", acceptedImmediateAccess: false });
  });

  it("passes the consent only when it is exactly true", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(apiOk(ORDER));
    for (const [sent, expected] of [[true, true], ["true", false], [1, false], [undefined, false]] as const) {
      await POST(post({ product: "pro_annual", acceptedImmediateAccess: sent }, BEARER));
      const init = (spy.mock.calls.at(-1) as [string, RequestInit])[1];
      expect(JSON.parse(init.body as string).acceptedImmediateAccess, String(sent)).toBe(expected);
    }
  });

  it("needs a bearer token", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    for (const headers of [{}, { authorization: "" }, { authorization: "Basic abc" }, { authorization: "Bearer" }]) {
      expect((await POST(post({ product: "pro_annual" }, headers))).status).toBe(401);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses a product the website does not sell, without asking the API", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    for (const product of ["pro_monthly", "", "family_monthly", "../admin"]) {
      expect((await POST(post({ product }, BEARER))).status, product).toBe(400);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("falls back to INR rather than passing on a currency we do not price in", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk(ORDER));
    await POST(post({ product: "pro_annual", currency: "JPY" }, BEARER));
    expect(JSON.parse((spy.mock.calls[0] as [string, RequestInit])[1].body as string).currency).toBe("INR");
  });

  it("refuses a body that is not JSON, and an oversized one", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await POST(post("not json", BEARER))).status).toBe(400);
    expect((await POST(post({ product: "pro_annual" }, { ...BEARER, "content-length": "99999" }))).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("passes the API's status through, so the page can tell the cases apart", async () => {
    for (const status of [401, 503, 502]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "pro_annual is not available in USD." } }), { status })
      );
      const response = await POST(post({ product: "pro_annual" }, BEARER));
      expect(response.status).toBe(status);
      expect((await response.json()).error).toBe("pro_annual is not available in USD.");
      vi.restoreAllMocks();
    }
  });

  it("says something plain when the API cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const response = await POST(post({ product: "pro_annual" }, BEARER));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("ECONNREFUSED");
  });

  it("is never cached", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiOk(ORDER));
    expect((await POST(post({ product: "pro_annual" }, BEARER))).headers.get("cache-control")).toBe("no-store");
  });
});

describe("bodies that are not what they claim", () => {
  it("refuses a product that is not a string", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    for (const product of [42, null, ["pro_annual"], { product: "pro_annual" }]) {
      expect((await POST(post({ product }, BEARER))).status, String(product)).toBe(400);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("has something to say when the API refuses without a message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 503 }));
    const response = await POST(post({ product: "pro_annual" }, BEARER));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("Could not start the checkout.");
  });

  it("returns an empty order rather than null when the API sends no data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    const response = await POST(post({ product: "pro_annual" }, BEARER));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
  });
});

describe("the timeout", () => {
  it("gives up rather than holding the page open", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) =>
      new Promise((_resolve, reject) => {
        (init as RequestInit).signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
    );
    const pending = POST(post({ product: "pro_annual" }, BEARER));
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await pending).status).toBe(502);
    vi.useRealTimers();
  });
});
