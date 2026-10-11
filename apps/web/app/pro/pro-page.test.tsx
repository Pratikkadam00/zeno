// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProPrices } from "./ProPrices";

/**
 * /pro offers whatever the API has a configured price for (D24). Two states
 * matter: nothing priced, which is today and also what every visitor sees
 * before the answer arrives, and a product priced, which is the day the owner
 * sets one. The page must never show a price it was not given.
 */
vi.mock("../fonts", () => ({ fontClassNames: "fonts" }));

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const PRICED = { currency: "INR", configured: true, products: [{ product: "pro_annual", plan: "pro", amountMinor: 49900 }] };

afterEach(() => vi.restoreAllMocks());

describe("the page itself", () => {
  it("explains Pro without quoting a price, so it is worth reading either way", async () => {
    const { default: ProPage } = await import("./page");
    const markup = renderToStaticMarkup(ProPage());
    expect(markup).toContain("Unlimited subscriptions");
    expect(markup).toContain("What the free plan already covers");
    expect(markup).not.toMatch(/₹|\$\d/);
  });
});

describe("before the answer arrives, and when nothing is for sale", () => {
  it("says where Pro can be bought instead of offering it here", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    render(<ProPrices />);
    expect(screen.getByText(/not on sale on this website yet/)).toBeTruthy();
    expect(screen.queryByText(/Buy it here/)).toBeNull();
  });

  it("stays on that answer when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText(/not on sale on this website yet/)).toBeTruthy());
  });

  it("stays on that answer when the route returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 502 }));
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText(/not on sale on this website yet/)).toBeTruthy());
  });

  it("offers nothing when prices exist but the server has no keys", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ ...PRICED, configured: false }));
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText(/not on sale on this website yet/)).toBeTruthy());
    expect(screen.queryByText("₹499.00")).toBeNull();
  });
});

describe("once a product is priced", () => {
  it("shows each product at the price the API gave, and nothing else", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({
      currency: "INR",
      configured: true,
      products: [
        { product: "pro_annual", plan: "pro", amountMinor: 49900 },
        { product: "pro_lifetime", plan: "pro", amountMinor: 999900 }
      ]
    }));
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText("₹499.00")).toBeTruthy());
    expect(screen.getByText("Pro, one year")).toBeTruthy();
    expect(screen.getByText("₹9999.00")).toBeTruthy();
    // Family has no price, so it is not offered.
    expect(screen.queryByText("Family, one year")).toBeNull();
  });

  it("says the purchase does not renew, because it does not", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(PRICED));
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText(/nothing to cancel/)).toBeTruthy());
  });

  it("points at the refund policy before asking for money", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok(PRICED));
    const { container } = render(<ProPrices />);
    await waitFor(() => expect(container.querySelector('a[href="/legal/refunds"]')).toBeTruthy());
  });

  it("ignores a price the route should never have sent", async () => {
    // The route parses the API's answer and so does this component: a product
    // we do not sell on the web cannot be made to appear by the thing between.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({
      currency: "INR",
      configured: true,
      products: [{ product: "pro_monthly", plan: "pro", amountMinor: 9900 }]
    }));
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText(/not on sale on this website yet/)).toBeTruthy());
  });
});
