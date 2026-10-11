import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { fetchWithTimeout } from "./http";
import type { BillingPlan, Entitlement } from "./billing";
import { kvDeleteAwait, kvDeleteByValueField, kvPersistAwait, registerHydrator, type StoredEntry } from "./storage/pg";

// Razorpay web checkout (docs/RAZORPAY_WEB_CHECKOUT.md). Pro is also sold on
// the public website, because Google Play requires Play's billing system for
// purchases made INSIDE the app but does not cover purchases made outside it.
// Both paths grant the same entitlement and the server stays the source of
// truth.
//
// The one real difference from the RevenueCat side of billing.ts: that
// entitlement is a CACHE of RevenueCat's answer, re-verified after a TTL. A paid
// one-time order has nothing to re-verify — it is authoritative until its own
// expiry — so a grant here is stored durably and stands until it expires or a
// refund revokes it.
//
// Env: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET  (server-only; order creation)
//      RAZORPAY_WEBHOOK_SECRET                (the secret set on the webhook)
//      RAZORPAY_WEBHOOK_SECRET_PREVIOUS       (optional, during a rotation)

/** What the website sells. Monthly stays in the app, on Play billing (D24). */
export type WebProduct = "pro_annual" | "pro_lifetime" | "family_annual";

export type WebGrant = {
  product: WebProduct;
  plan: BillingPlan;
  /** ISO-8601 UTC, or null for a lifetime purchase that never expires. */
  expiresAt: string | null;
  /** Razorpay's payment id — the receipt, and the idempotency key for a re-delivery. */
  paymentId: string;
  /** What was actually charged, in the minor unit of `currency` (paise, cents). */
  amountMinor: number;
  currency: string;
  grantedAt: string;
};

const RAZORPAY_API = "https://api.razorpay.com/v1";

// Below these, a configured price is read as a unit error rather than a price
// (see priceFor). ₹100 and $3.
const MINIMUM_MINOR: Record<"INR" | "USD", number> = { INR: 10_000, USD: 300 };

const PLAN_FOR: Record<WebProduct, BillingPlan> = {
  pro_annual: "pro",
  pro_lifetime: "pro",
  family_annual: "family"
};

const PLAN_RANK: Record<BillingPlan, number> = { free: 0, pro: 1, family: 2 };

// Razorpay retries a failed webhook delivery for a while, so a replayed event id
// has to be recognised for longer than that window; it is also the window in
// which a captured request could be re-sent. Seven days with a hard cap on the
// number of ids kept, so the guard cannot grow without bound.
const EVENT_MEMORY_MS = 7 * 24 * 60 * 60 * 1000;
const EVENT_MEMORY_MAX = 5_000;

const grants = new Map<string, WebGrant>();
const seenEvents = new Map<string, number>();

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export type WebCurrency = "INR" | "USD";

/**
 * Prices are configuration, never code: the amount charged is a number the
 * owner chose per currency, not a conversion of another currency's price
 * (ENGINEERING_STANDARDS §4 — no invented rates on anything with money on it).
 * Set RAZORPAY_PRICE_PRO_ANNUAL_INR and friends, in the MINOR unit.
 */
export function priceEnvName(product: WebProduct, currency: WebCurrency): string {
  return `RAZORPAY_PRICE_${product.toUpperCase()}_${currency}`;
}

/**
 * The configured price in minor units, or a reason it cannot be used. Nothing
 * is defaulted: an unset or unusable price means that product is not for sale
 * in that currency, which is the only safe reading.
 *
 * The floor is deliberate. The classic mistake with this kind of variable is
 * entering 499 meaning ₹499, which is 499 paise — ₹4.99, a hundredfold
 * undercharge that nothing downstream could notice. So each currency has a
 * minimum below which a value is read as a unit error rather than a price:
 * ₹100 and $3, both far under anything Zeno would charge for a year (the
 * cheapest thing it sells at all is $6.99 a month) and far over what the
 * mistake produces.
 */
export function priceFor(product: WebProduct, currency: WebCurrency): { amountMinor: number } | { error: string } {
  const name = priceEnvName(product, currency);
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return { error: `${name} is not set` };
  if (!/^\d+$/.test(raw.trim())) return { error: `${name} must be a whole number of minor units (paise or cents)` };
  const amountMinor = Number(raw.trim());
  const floor = MINIMUM_MINOR[currency];
  if (amountMinor < floor) {
    return { error: `${name} is below ${floor} minor units — set it in paise or cents, not rupees or dollars` };
  }
  return { amountMinor };
}

export const WEB_PRODUCTS: readonly WebProduct[] = ["pro_annual", "pro_lifetime", "family_annual"];

/**
 * What the website can sell right now, in one currency. A product with no
 * usable price is simply absent — so the page renders what is configured and
 * nothing else, and setting a price is all it takes to put a product on sale.
 */
export function availableProducts(currency: WebCurrency): { product: WebProduct; plan: BillingPlan; amountMinor: number }[] {
  const available = [];
  for (const product of WEB_PRODUCTS) {
    const price = priceFor(product, currency);
    if ("error" in price) continue;
    available.push({ product, plan: PLAN_FOR[product], amountMinor: price.amountMinor });
  }
  return available;
}

export type CreatedOrder = {
  orderId: string;
  amountMinor: number;
  currency: WebCurrency;
  /** The PUBLIC key id, which Razorpay Checkout needs in the browser. */
  keyId: string;
};

/**
 * Create the Razorpay order a checkout runs against. The amount and the account
 * it belongs to are decided HERE, server-side: `notes` is what the webhook later
 * reads to know who paid for what, so a buyer can neither choose their own price
 * nor attach someone else's account to a payment.
 */
export async function createOrder(
  accountId: string,
  product: WebProduct,
  currency: WebCurrency
): Promise<CreatedOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured.");
  const price = priceFor(product, currency);
  if ("error" in price) throw new Error(price.error);

  const response = await fetchWithTimeout(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      // Razorpay authenticates its REST API with HTTP Basic: key id as the user,
      // key secret as the password. Built here and never logged.
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      amount: price.amountMinor,
      currency,
      // Razorpay caps the receipt at 40 characters; a UUID is 36 and carries no
      // account information into a field that appears on statements.
      receipt: randomUUID(),
      notes: { accountId, product }
    })
  });
  if (!response.ok) {
    // The body can quote the request back; the status is all a caller needs and
    // all that is safe to surface.
    throw new Error(`Razorpay responded ${response.status}`);
  }
  const json = (await response.json()) as { id?: unknown; amount?: unknown; currency?: unknown };
  if (typeof json.id !== "string" || json.id.length === 0) {
    throw new Error("Razorpay returned an order with no id.");
  }
  // Trust our own amount over the echo: these must agree, and if they ever did
  // not, charging what we decided is the only defensible choice.
  return { orderId: json.id, amountMinor: price.amountMinor, currency, keyId };
}

export function razorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

/**
 * Verify a Razorpay webhook: HMAC-SHA256 of the RAW request body with the
 * webhook secret, compared against the `X-Razorpay-Signature` header
 * (https://razorpay.com/docs/webhooks/validate-test/). The body must be the
 * bytes as received — Razorpay's own warning is not to parse or cast it first,
 * and re-serialising a parsed body changes key order and whitespace, which
 * changes the digest.
 *
 * RAZORPAY_WEBHOOK_SECRET_PREVIOUS is accepted as well, because after a secret
 * change Razorpay's retries of earlier events still carry the old signature.
 * Clear it once the retry window has passed.
 */
export function verifyRazorpaySignature(rawBody: string | undefined, signature: string | undefined): boolean {
  // Fail closed on either half being absent. The route hands over whatever the
  // raw-body hook captured, so the "no body" case lives here, where it can be
  // tested, rather than as an untestable fallback at the call site.
  if (!signature || rawBody === undefined) return false;
  const secrets = [process.env.RAZORPAY_WEBHOOK_SECRET, process.env.RAZORPAY_WEBHOOK_SECRET_PREVIOUS]
    .filter((value): value is string => Boolean(value && value.length > 0));
  if (secrets.length === 0) return false;
  // Constant-time compare of fixed-length digests, as verifyWebhookAuth does for
  // RevenueCat (finding F86): comparing the hex strings directly needs equal
  // lengths first, so a wrong-length guess returns early and leaks the length.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  const received = digest(signature);
  return secrets.some((secret) =>
    timingSafeEqual(digest(createHmac("sha256", secret).update(rawBody).digest("hex")), received)
  );
}

/**
 * The plan and expiry a paid product grants. Annual adds one calendar year in
 * UTC — never 365 days, which drifts a day every leap year and would hand a
 * buyer in a leap year less than they paid for. A 29 February purchase lands on
 * 1 March, which is the normal behaviour of a calendar year in JavaScript and is
 * a day in the buyer's favour.
 */
export function grantWindow(product: WebProduct, nowMs: number): { plan: BillingPlan; expiresAt: string | null } {
  const plan = PLAN_FOR[product];
  if (product === "pro_lifetime") {
    return { plan, expiresAt: null };
  }
  const expires = new Date(nowMs);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return { plan, expiresAt: expires.toISOString() };
}

export function isWebGrantActive(grant: WebGrant, nowMs: number = Date.now()): boolean {
  return grant.expiresAt === null || Date.parse(grant.expiresAt) > nowMs;
}

export function entitlementFromWebGrant(grant: WebGrant, nowMs: number = Date.now()): Entitlement {
  const active = isWebGrantActive(grant, nowMs);
  return {
    plan: active ? grant.plan : "free",
    active,
    expiresAt: active ? grant.expiresAt : null,
    source: "razorpay"
  };
}

/**
 * The better of two entitlements, so a buyer is never downgraded by whichever
 * source answered last. Someone on monthly Pro through Play who then buys
 * lifetime on the web holds both; the web grant has to win, and the reverse
 * (a Play purchase on top of a lapsed web grant) has to win too.
 *
 * Higher plan first, then the later expiry, with null (lifetime) beating every
 * date. An inactive entitlement never wins.
 */
export function betterEntitlement(a: Entitlement, b: Entitlement): Entitlement {
  if (!a.active) return b;
  if (!b.active) return a;
  if (PLAN_RANK[a.plan] !== PLAN_RANK[b.plan]) {
    return PLAN_RANK[a.plan] > PLAN_RANK[b.plan] ? a : b;
  }
  if (a.expiresAt === null || b.expiresAt === null) {
    return a.expiresAt === null ? a : b;
  }
  return Date.parse(a.expiresAt) >= Date.parse(b.expiresAt) ? a : b;
}

export function getWebGrant(accountId: string): WebGrant | undefined {
  return grants.get(accountId);
}

/**
 * Record a paid grant. Resolves only once the row is durable, so the webhook
 * acks after the grant is safe rather than before (finding F75): a 200 that
 * Razorpay believes and a grant lost to a restart would leave a paying customer
 * on the free plan with no retry coming.
 */
export async function recordWebGrant(accountId: string, grant: WebGrant): Promise<boolean> {
  const stored = await kvPersistAwait("billing-web", accountId, grant);
  if (stored) grants.set(accountId, grant);
  return stored;
}

/**
 * Drop a grant — a refund, a chargeback, or account deletion. Durable for the
 * same reason as recordWebGrant, in the other direction: a refunded buyer who
 * keeps Pro because the revocation was only in memory is the mirror of the bug
 * the RevenueCat TTL exists to bound.
 */
export async function revokeWebGrant(accountId: string): Promise<boolean> {
  const removed = await kvDeleteAwait("billing-web", accountId);
  if (removed) grants.delete(accountId);
  return removed;
}

/**
 * True the first time an event id is seen, false for a re-delivery or a replay.
 * Razorpay can deliver the same event more than once by design, so this is what
 * keeps a second delivery from extending a subscription a second time.
 */
export function claimEvent(eventId: string, nowMs: number = Date.now()): boolean {
  for (const [id, at] of seenEvents) {
    if (nowMs - at > EVENT_MEMORY_MS) seenEvents.delete(id);
  }
  if (seenEvents.has(eventId)) return false;
  // Oldest-first eviction if the cap is reached: Map preserves insertion order,
  // and every id inserted here is newer than the one before it.
  for (const oldest of seenEvents.keys()) {
    if (seenEvents.size < EVENT_MEMORY_MAX) break;
    seenEvents.delete(oldest);
  }
  seenEvents.set(eventId, nowMs);
  return true;
}

/**
 * Revoke by payment id, which is what a refund gives us: the refund event names
 * the payment it reverses, not the account. Small scale, so the in-memory
 * lookup is a scan; the durable delete goes by the stored field, so a retry
 * still finds the row after the in-memory copy is gone (the F75 pattern that
 * kvDeleteByValueField exists for).
 */
export async function revokeWebGrantByPayment(paymentId: string): Promise<boolean> {
  const removed = await kvDeleteByValueField("billing-web", "paymentId", paymentId);
  if (!removed) return false;
  for (const [accountId, grant] of grants) {
    if (grant.paymentId === paymentId) grants.delete(accountId);
  }
  return true;
}

/** Test/maintenance helper. */
export function clearWebBillingState(): void {
  grants.clear();
  seenEvents.clear();
}

registerHydrator("billing-web", (entries: StoredEntry[]) => {
  for (const { key, value } of entries) {
    const grant = value as WebGrant | null;
    // A row is only loaded if it still looks like a grant: the hydrator runs on
    // whatever the database holds, including rows written by an older shape.
    if (grant && typeof grant.paymentId === "string" && typeof grant.plan === "string") {
      grants.set(key, grant);
    }
  }
});
