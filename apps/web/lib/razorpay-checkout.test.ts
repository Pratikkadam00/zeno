// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutOptions, loadCheckoutScript, openCheckout } from "./razorpay-checkout";

/**
 * Opening Razorpay's Standard Checkout. The option names and callbacks are
 * theirs; what is ours is that the amount is passed in the minor unit we hold
 * everywhere, that nothing here grants anything (the webhook does), and that
 * closing the window or a declined card are outcomes rather than errors.
 */
const ORDER = { orderId: "order_1", amountMinor: 49900, currency: "INR", keyId: "rzp_test_key" };

type Handlers = { handler?: ((r: unknown) => void) | undefined; ondismiss?: (() => void) | undefined; failed?: ((r: unknown) => void) | undefined };

/** A stand-in for Razorpay's global, capturing what it was given. */
function fakeRazorpay(act: (h: Handlers) => void) {
  const captured: { options?: Record<string, unknown> } = {};
  (window as unknown as { Razorpay: unknown }).Razorpay = function (options: Record<string, unknown>) {
    captured.options = options;
    const handlers: Handlers = {
      handler: options.handler as Handlers["handler"],
      ondismiss: (options.modal as { ondismiss?: () => void } | undefined)?.ondismiss
    };
    return {
      on: (event: string, cb: (r: unknown) => void) => {
        if (event === "payment.failed") handlers.failed = cb;
      },
      open: () => act(handlers)
    };
  };
  return captured;
}

afterEach(() => {
  delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  document.getElementById("razorpay-checkout")?.remove();
  vi.restoreAllMocks();
});

describe("checkoutOptions", () => {
  it("passes the amount in the minor unit, untouched", () => {
    // Razorpay takes paise and cents, which is what we hold everywhere: no
    // conversion, no rounding, nothing to get wrong.
    expect(checkoutOptions(ORDER, "buyer@example.com", "Pro, one year")).toMatchObject({
      key: "rzp_test_key",
      amount: 49900,
      currency: "INR",
      order_id: "order_1",
      name: "Zeno",
      description: "Pro, one year",
      prefill: { email: "buyer@example.com" }
    });
  });

  it("turns off Razorpay's own retry, so the page owns what happens next", () => {
    expect(checkoutOptions(ORDER, "a@b.com", "x").retry).toEqual({ enabled: false });
  });

  it("sends no name, phone or address it was not given", () => {
    const options = checkoutOptions(ORDER, "a@b.com", "x");
    expect(options.prefill).toEqual({ email: "a@b.com" });
    expect(options.notes).toBeUndefined();
  });
});

describe("loadCheckoutScript", () => {
  it("adds the script once and resolves when it loads", async () => {
    const pending = loadCheckoutScript();
    const script = document.getElementById("razorpay-checkout") as HTMLScriptElement;
    expect(script.src).toBe("https://checkout.razorpay.com/v1/checkout.js");
    expect(script.async).toBe(true);
    script.dispatchEvent(new Event("load"));
    await expect(pending).resolves.toBeUndefined();
    expect(document.querySelectorAll("#razorpay-checkout")).toHaveLength(1);
  });

  it("does nothing when Razorpay is already there", async () => {
    (window as unknown as { Razorpay: unknown }).Razorpay = function () {};
    await expect(loadCheckoutScript()).resolves.toBeUndefined();
    expect(document.getElementById("razorpay-checkout")).toBeNull();
  });

  it("waits for a load already in flight rather than adding a second script", async () => {
    const first = loadCheckoutScript();
    const second = loadCheckoutScript();
    expect(document.querySelectorAll("#razorpay-checkout")).toHaveLength(1);
    document.getElementById("razorpay-checkout")!.dispatchEvent(new Event("load"));
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it("fails a second caller too when the script in flight fails", async () => {
    const first = loadCheckoutScript();
    const second = loadCheckoutScript();
    document.getElementById("razorpay-checkout")!.dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow("Could not load the payment window.");
    await expect(second).rejects.toThrow("Could not load the payment window.");
  });

  it("says plainly when the script cannot be loaded", async () => {
    const pending = loadCheckoutScript();
    document.getElementById("razorpay-checkout")!.dispatchEvent(new Event("error"));
    await expect(pending).rejects.toThrow("Could not load the payment window.");
  });
});

describe("openCheckout", () => {
  /** Pretend the script loaded and installed the global. */
  function scriptLoads() {
    const original = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const element = original(tag) as HTMLElement;
      if (tag === "script") queueMicrotask(() => element.dispatchEvent(new Event("load")));
      return element;
    });
  }

  it("reports a successful payment with its id", async () => {
    scriptLoads();
    fakeRazorpay((h) => h.handler?.({ razorpay_payment_id: "pay_123", razorpay_order_id: "order_1", razorpay_signature: "sig" }));
    await expect(openCheckout(ORDER, "a@b.com", "Pro")).resolves.toEqual({ status: "paid", paymentId: "pay_123" });
  });

  it("still reports paid when the callback carries no payment id", async () => {
    // The id is only for the page's own message; the grant comes from the
    // signed webhook, so a missing id must not read as a failed payment.
    scriptLoads();
    fakeRazorpay((h) => h.handler?.({}));
    await expect(openCheckout(ORDER, "a@b.com", "Pro")).resolves.toEqual({ status: "paid", paymentId: "" });
  });

  it("reports a closed window as dismissed, not as a failure", async () => {
    scriptLoads();
    fakeRazorpay((h) => h.ondismiss?.());
    await expect(openCheckout(ORDER, "a@b.com", "Pro")).resolves.toEqual({ status: "dismissed" });
  });

  it("reports a declined payment with Razorpay's own reason", async () => {
    scriptLoads();
    fakeRazorpay((h) => h.failed?.({ error: { description: "Your bank declined the payment." } }));
    await expect(openCheckout(ORDER, "a@b.com", "Pro")).resolves.toEqual({
      status: "failed",
      reason: "Your bank declined the payment."
    });
  });

  it("has something to say when the failure carries no description", async () => {
    scriptLoads();
    fakeRazorpay((h) => h.failed?.({ error: {} }));
    await expect(openCheckout(ORDER, "a@b.com", "Pro")).resolves.toEqual({
      status: "failed",
      reason: "The payment did not go through."
    });
  });

  it("settles once, even if Razorpay calls back twice", async () => {
    scriptLoads();
    fakeRazorpay((h) => {
      h.handler?.({ razorpay_payment_id: "pay_123" });
      h.ondismiss?.();
      h.failed?.({ error: { description: "too late" } });
    });
    await expect(openCheckout(ORDER, "a@b.com", "Pro")).resolves.toEqual({ status: "paid", paymentId: "pay_123" });
  });

  it("gives Razorpay the order the server made", async () => {
    scriptLoads();
    const captured = fakeRazorpay((h) => h.ondismiss?.());
    await openCheckout(ORDER, "buyer@example.com", "Pro, one year");
    expect(captured.options).toMatchObject({ order_id: "order_1", amount: 49900, key: "rzp_test_key" });
  });

  it("refuses to pretend when the script loaded but the global is missing", async () => {
    scriptLoads();
    await expect(openCheckout(ORDER, "a@b.com", "Pro")).rejects.toThrow("Could not load the payment window.");
  });
});
