// Opening Razorpay's Standard Checkout over the page.
//
// The script, the option names and the callbacks are theirs, taken from the
// Standard Checkout integration guide (razorpay.com/docs/payments/payment-
// gateway/web-integration/standard/integration-steps/): checkout.js, an options
// object carrying key/amount/currency/order_id, a `handler` that receives
// razorpay_payment_id, razorpay_order_id and razorpay_signature, `rzp.open()`,
// the `payment.failed` event, and modal.ondismiss.
//
// What the handler does NOT do here is grant anything. Razorpay's own guidance
// is to verify server-side, and our server already hears it from the webhook,
// which is signed and retried. The handler only tells the page to stop waiting
// and re-read the entitlement. A buyer who closes the browser the moment the
// payment succeeds still gets Pro, because the webhook does not depend on them.

export type CheckoutOrder = {
  orderId: string;
  amountMinor: number;
  currency: string;
  keyId: string;
};

export type CheckoutOutcome = { status: "paid"; paymentId: string } | { status: "dismissed" } | { status: "failed"; reason: string };

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const SCRIPT_ID = "razorpay-checkout";

type RazorpayInstance = { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

/** Loaded once per page: a second <script> would redefine the global. */
export function loadCheckoutScript(doc: Document = document): Promise<void> {
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  const existing = doc.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load the payment window.")));
    });
  }
  return new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Could not load the payment window.")));
    doc.head.appendChild(script);
  });
}

/** The options Razorpay is given. Exported so a test can read them without a browser. */
export function checkoutOptions(order: CheckoutOrder, email: string, description: string): Record<string, unknown> {
  return {
    key: order.keyId,
    // Razorpay takes the amount in the minor unit, which is what we hold
    // everywhere: no conversion, no rounding, nothing to get wrong.
    amount: order.amountMinor,
    currency: order.currency,
    order_id: order.orderId,
    name: "Zeno",
    description,
    // So the buyer does not type it again, and so the receipt reaches the
    // address the purchase is bound to.
    prefill: { email },
    // Razorpay's own retry UI would re-open on a failure we have already
    // reported; the page offers the retry instead.
    retry: { enabled: false }
  };
}

/**
 * Opens the modal and settles when the buyer leaves it, one way or another.
 * Never rejects for a dismissal or a declined card: those are outcomes, not
 * errors, and the page says something different for each.
 */
export async function openCheckout(order: CheckoutOrder, email: string, description: string): Promise<CheckoutOutcome> {
  await loadCheckoutScript();
  const Razorpay = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (!Razorpay) throw new Error("Could not load the payment window.");

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const settle = (outcome: CheckoutOutcome) => {
      if (!settled) {
        settled = true;
        resolve(outcome);
      }
    };
    const options = {
      ...checkoutOptions(order, email, description),
      handler: (response: unknown) => {
        const paymentId = (response as { razorpay_payment_id?: unknown })?.razorpay_payment_id;
        settle({ status: "paid", paymentId: typeof paymentId === "string" ? paymentId : "" });
      },
      modal: { ondismiss: () => settle({ status: "dismissed" }) }
    };
    const rzp = new Razorpay(options);
    rzp.on("payment.failed", (response: unknown) => {
      const description = (response as { error?: { description?: unknown } })?.error?.description;
      settle({ status: "failed", reason: typeof description === "string" && description.length > 0 ? description : "The payment did not go through." });
    });
    rzp.open();
  });
}
