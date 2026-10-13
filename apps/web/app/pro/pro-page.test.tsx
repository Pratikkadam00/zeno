// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProPrices } from "./ProPrices";

const checkout = vi.hoisted(() => ({ outcome: { status: "paid", paymentId: "pay_1" } as unknown, calls: [] as unknown[] }));
vi.mock("@/lib/razorpay-checkout", () => ({
  openCheckout: async (...args: unknown[]) => {
    checkout.calls.push(args);
    return checkout.outcome;
  }
}));

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

describe("buying", () => {
  /** Answers each same-origin route the flow calls. */
  function routes(over: Partial<Record<"prices" | "session" | "order", () => Response>> = {}) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/checkout/prices")) return (over.prices ?? (() => ok(PRICED)))();
      if (url.includes("/api/checkout/session")) return (over.session ?? (() => ok({ sent: true, accessToken: "token-value" })))();
      if (url.includes("/api/checkout/order")) {
        return (over.order ?? (() => ok({ orderId: "order_1", amountMinor: 49900, currency: "INR", keyId: "rzp_test_key" })))();
      }
      throw new Error(`unexpected request to ${url}`);
    });
  }

  const err = (status: number, message: string) =>
    new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });

  /** Choose the product, sign in with the code, and arrive at the confirm step. */
  async function signIn() {
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText("₹499.00")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Buy Pro, one year/ }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "buyer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send the code" }));
    await waitFor(() => expect(screen.getByLabelText("Code")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Pay ₹499.00/ })).toBeTruthy());
  }

  beforeEach(() => {
    checkout.outcome = { status: "paid", paymentId: "pay_1" };
    checkout.calls.length = 0;
  });

  it("asks for the account before taking money", async () => {
    routes();
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText("₹499.00")).toBeTruthy());
    expect(screen.queryByLabelText("Email address")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Buy Pro, one year/ }));
    expect(screen.getByLabelText("Email address")).toBeTruthy();
  });

  it("sends the code to the address given, then exchanges it", async () => {
    const spy = routes();
    await signIn();
    const bodies = spy.mock.calls
      .filter(([url]) => String(url).includes("/session"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(bodies[0]).toEqual({ email: "buyer@example.com" });
    expect(bodies[1]).toEqual({ email: "buyer@example.com", code: "123456" });
  });

  it("says so when the code cannot be sent, and does not move on", async () => {
    routes({ session: () => err(502, "Could not send the code. Please try again shortly.") });
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText("₹499.00")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Buy Pro, one year/ }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "buyer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send the code" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Could not send the code"));
    expect(screen.queryByLabelText("Code")).toBeNull();
  });

  it("says so when the code is wrong, and keeps the buyer on that step", async () => {
    let asked = 0;
    routes({
      session: () => {
        asked += 1;
        return asked === 1 ? ok({ sent: true }) : err(401, "That code is wrong or has expired. Ask for a new one.");
      }
    });
    render(<ProPrices />);
    await waitFor(() => expect(screen.getByText("₹499.00")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Buy Pro, one year/ }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "buyer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send the code" }));
    await waitFor(() => expect(screen.getByLabelText("Code")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("wrong or has expired"));
    expect(screen.getByLabelText("Code")).toBeTruthy();
  });

  it("sends the consent exactly as the buyer left the box", async () => {
    const spy = routes();
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(screen.getByText(/Pro is on/)).toBeTruthy());
    const order = spy.mock.calls.filter(([url]) => String(url).includes("/order")).at(-1)!;
    expect(JSON.parse((order[1] as RequestInit).body as string)).toEqual({
      product: "pro_annual",
      currency: "INR",
      acceptedImmediateAccess: false
    });
  });

  it("sends the consent when the box is ticked", async () => {
    const spy = routes();
    await signIn();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(screen.getByText(/Pro is on/)).toBeTruthy());
    const order = spy.mock.calls.filter(([url]) => String(url).includes("/order")).at(-1)!;
    expect(JSON.parse((order[1] as RequestInit).body as string).acceptedImmediateAccess).toBe(true);
  });

  it("carries the token to the order, so the purchase is bound to the account", async () => {
    const spy = routes();
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(screen.getByText(/Pro is on/)).toBeTruthy());
    const order = spy.mock.calls.filter(([url]) => String(url).includes("/order")).at(-1)!;
    expect((order[1] as RequestInit).headers).toMatchObject({ authorization: "Bearer token-value" });
  });

  it("opens the payment window with the order the server made", async () => {
    routes();
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(checkout.calls.length).toBe(1));
    const [order, email] = checkout.calls[0] as [Record<string, unknown>, string];
    expect(order).toEqual({ orderId: "order_1", amountMinor: 49900, currency: "INR", keyId: "rzp_test_key" });
    expect(email).toBe("buyer@example.com");
  });

  it("tells the buyer Pro is on, and where to find it", async () => {
    routes();
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(screen.getByText(/Pro is on/)).toBeTruthy());
    expect(screen.getByText(/buyer@example.com/)).toBeTruthy();
  });

  it("comes back to the same button when the window is closed, with nothing to apologise for", async () => {
    routes();
    checkout.outcome = { status: "dismissed" };
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Pay ₹499.00/ })).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the reason when the payment is declined", async () => {
    routes();
    checkout.outcome = { status: "failed", reason: "Your bank declined the payment." };
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Your bank declined"));
    expect(screen.getByRole("button", { name: /Pay ₹499.00/ })).toBeTruthy();
  });

  it("shows what the server said when the order cannot be started", async () => {
    routes({ order: () => err(503, "pro_annual is not available in INR.") });
    await signIn();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₹499.00/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("not available in INR"));
    expect(checkout.calls.length).toBe(0);
  });
});
