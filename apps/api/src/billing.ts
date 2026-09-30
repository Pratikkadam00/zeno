import { createHash, timingSafeEqual } from "node:crypto";
import { fetchWithTimeout } from "./http";
import { kvClear, kvDeleteAwait, kvPersist, registerHydrator, type StoredEntry } from "./storage/pg";

// Server-side entitlement verification. The mobile client reports a plan from
// the RevenueCat SDK, but a tampered client could lie — so the server is the
// source of truth: it independently asks RevenueCat (REST) for the subscriber's
// entitlements, and accepts RevenueCat webhooks (auth-checked) to stay current.
//
// Env: REVENUECAT_SECRET_KEY  (REST "secret" API key, server-only)
//      REVENUECAT_WEBHOOK_AUTH (the Authorization header value you set in the
//                               RevenueCat webhook config)

export type BillingPlan = "free" | "pro" | "family";

export type Entitlement = {
  plan: BillingPlan;
  active: boolean;
  expiresAt: string | null;
  source: "revenuecat" | "cache" | "unconfigured";
};

const REVENUECAT_API = "https://api.revenuecat.com/v1";
const PRO_IDS = ["pro", "zeno_pro"];
const FAMILY_IDS = ["family", "zeno_family"];

// Latest known entitlement per app user, updated by webhooks (read as fast path).
// Mirrored to Postgres when DATABASE_URL is set so a restart doesn't force every
// client to re-fetch from RevenueCat before its plan is recognized again.
//
// Each entry carries the time it was cached. After ENTITLEMENT_TTL_MS the entry
// is treated as stale and getCachedEntitlement returns undefined, forcing the
// caller to re-verify against RevenueCat's REST API. This bounds the damage of a
// replayed/forged webhook (a forged "grant" self-heals within the TTL) and stops
// a missed downgrade webhook from granting Pro indefinitely.
const ENTITLEMENT_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { entitlement: Entitlement; cachedAtMs: number }>();
// Finding F87. A RevenueCat lookup can still be in flight when a webhook or an
// account deletion drops the user's cached answer; when it lands it used to
// cache the OLDER answer (and, after a deletion, re-create the deleted user's
// billing row). Every drop bumps the user's generation, and a lookup caches its
// answer only if the generation it started with is still current.
const generations = new Map<string, number>();

function cacheEntitlement(appUserId: string, entitlement: Entitlement, cachedAtMs = Date.now()): void {
  const entry = { entitlement, cachedAtMs };
  cache.set(appUserId, entry);
  // Persist the cache time too, so the TTL is measured from the real write rather
  // than reset to "fresh" on every restart.
  kvPersist("billing", appUserId, entry);
}

export function billingConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_KEY);
}

export function webhookConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_WEBHOOK_AUTH);
}

// The prefix is optional on BOTH sides: the env value is documented as the
// header value set in RevenueCat, which may itself be "Bearer <secret>".
function withoutBearer(value: string): string {
  return value.startsWith("Bearer ") ? value.slice(7) : value;
}

export function verifyWebhookAuth(authHeader: string | undefined): boolean {
  const configured = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!configured || !authHeader) return false;
  const expected = withoutBearer(configured);
  if (!expected) return false; // a bare "Bearer " is no secret at all
  const token = withoutBearer(authHeader);
  // Constant-time compare of fixed-length digests (finding F86). Comparing the
  // raw values needed equal lengths first, so a guess of the wrong length
  // returned early and the secret's length leaked through timing.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(token), digest(expected));
}

export function planFromEntitlements(
  entitlements: Record<string, { expires_date: string | null }>,
  now: number = Date.now()
): { plan: BillingPlan; active: boolean; expiresAt: string | null } {
  const isActive = (entry?: { expires_date: string | null }): boolean =>
    Boolean(entry) && (entry!.expires_date === null || Date.parse(entry!.expires_date) > now);

  for (const id of FAMILY_IDS) {
    if (isActive(entitlements[id])) return { plan: "family", active: true, expiresAt: entitlements[id]!.expires_date };
  }
  for (const id of PRO_IDS) {
    if (isActive(entitlements[id])) return { plan: "pro", active: true, expiresAt: entitlements[id]!.expires_date };
  }
  return { plan: "free", active: false, expiresAt: null };
}

export async function fetchEntitlement(appUserId: string): Promise<Entitlement> {
  if (!billingConfigured()) {
    return { plan: "free", active: false, expiresAt: null, source: "unconfigured" };
  }
  // P2.7: the account id is the only request-derived part of any outbound URL.
  // It is our own signed token's subject (acct_ + base64url), but the rule is
  // enforced here, where the URL is built: encodeURIComponent leaves "." alone,
  // and a "." or ".." segment (or "%2e%2e") is resolved by the URL parser, which
  // would send our secret key to /v1/ instead of /v1/subscribers/<id>.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(appUserId)) {
    throw new Error("Refusing an unexpected account id.");
  }
  const generation = generations.get(appUserId) ?? 0;
  const response = await fetchWithTimeout(`${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`, Accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`RevenueCat responded ${response.status}`);
  }
  const json = (await response.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
  };
  const resolved = planFromEntitlements(json.subscriber?.entitlements ?? {});
  const entitlement: Entitlement = { ...resolved, source: "revenuecat" };
  if ((generations.get(appUserId) ?? 0) === generation) cacheEntitlement(appUserId, entitlement);
  return entitlement;
}

export function getCachedEntitlement(appUserId: string): Entitlement | undefined {
  const entry = cache.get(appUserId);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAtMs > ENTITLEMENT_TTL_MS) return undefined; // stale → re-verify
  const { entitlement } = entry;
  // Never serve an active grant past its own expiry, even within the TTL window or
  // just after a restart — a missed EXPIRATION webhook must not extend Pro/Family.
  if (entitlement.active && entitlement.expiresAt !== null && Date.parse(entitlement.expiresAt) <= Date.now()) {
    return undefined;
  }
  return entitlement;
}

// Test/maintenance helper.
export function clearEntitlementCache(): void {
  cache.clear();
  void kvClear("billing");
}

// Drop one user's cached entitlement (in-memory + persisted), so the next read
// asks RevenueCat. Used by account deletion and by every RevenueCat webhook
// (finding F85: a webhook's payload is never trusted, only acted on as "this
// user changed"). Keyed directly by appUserId, so a single delete is exact, and
// a retry finds the row even after the in-memory copy is gone. Resolves once the
// row is gone (false if the database rejected the delete) so the caller acks
// only durable deletion (finding F75). Any lookup already in flight for this
// user will not cache its answer (F87).
export async function deleteEntitlementForUser(appUserId: string): Promise<boolean> {
  generations.set(appUserId, (generations.get(appUserId) ?? 0) + 1);
  cache.delete(appUserId);
  return kvDeleteAwait("billing", appUserId);
}

registerHydrator("billing", (entries: StoredEntry[]) => {
  for (const { key, value } of entries) {
    // New rows are the { entitlement, cachedAtMs } wrapper; restore the real cache
    // time so the TTL isn't reset by a restart. Tolerate an older bare-entitlement
    // row by treating it as already stale (cachedAtMs 0) → re-verify on first read.
    const wrapped = value as { entitlement?: Entitlement; cachedAtMs?: number };
    if (wrapped && wrapped.entitlement) {
      cache.set(key, { entitlement: wrapped.entitlement, cachedAtMs: typeof wrapped.cachedAtMs === "number" ? wrapped.cachedAtMs : 0 });
    } else {
      cache.set(key, { entitlement: value as Entitlement, cachedAtMs: 0 });
    }
  }
});
