import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { BillingPlan, Entitlement } from "./billing";
import { kvDeleteAwait, kvPersistAwait, registerHydrator, type StoredEntry } from "./storage/pg";

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
export function verifyRazorpaySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false;
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
