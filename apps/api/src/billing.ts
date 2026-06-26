import { timingSafeEqual } from "node:crypto";
import { kvClear, kvPersist, registerHydrator, type StoredEntry } from "./storage/pg";

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

function cacheEntitlement(appUserId: string, entitlement: Entitlement, cachedAtMs = Date.now()): void {
  cache.set(appUserId, { entitlement, cachedAtMs });
  kvPersist("billing", appUserId, entitlement);
}

export function billingConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_KEY);
}

export function webhookConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_WEBHOOK_AUTH);
}

export function verifyWebhookAuth(authHeader: string | undefined): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || !authHeader) return false;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  // Constant-time compare so the shared secret can't be brute-forced by timing.
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
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
  const response = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`, {
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
  cacheEntitlement(appUserId, entitlement);
  return entitlement;
}

export function getCachedEntitlement(appUserId: string): Entitlement | undefined {
  const entry = cache.get(appUserId);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAtMs > ENTITLEMENT_TTL_MS) return undefined; // stale → re-verify
  return entry.entitlement;
}

// Apply a RevenueCat webhook event to the cache (call only after auth check).
export function applyWebhookEvent(body: unknown): void {
  const event = (body as {
    event?: { app_user_id?: string; type?: string; entitlement_ids?: string[]; expiration_at_ms?: number };
  }).event;
  if (!event?.app_user_id) return;

  const ids = event.entitlement_ids ?? [];
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const downgrade = event.type === "EXPIRATION" || event.type === "CANCELLATION" || event.type === "SUBSCRIPTION_PAUSED";

  let plan: BillingPlan = "free";
  let active = false;
  if (!downgrade) {
    if (ids.some((id) => FAMILY_IDS.includes(id))) { plan = "family"; active = true; }
    else if (ids.some((id) => PRO_IDS.includes(id))) { plan = "pro"; active = true; }
  }
  const entitlement: Entitlement = { plan, active, expiresAt, source: "cache" };
  cacheEntitlement(event.app_user_id, entitlement);
}

// Test/maintenance helper.
export function clearEntitlementCache(): void {
  cache.clear();
  void kvClear("billing");
}

registerHydrator("billing", (entries: StoredEntry[]) => {
  // Hydrated entries are treated as just-cached; the TTL re-verifies them against
  // RevenueCat shortly after boot rather than trusting a persisted grant forever.
  for (const { key, value } of entries) cache.set(key, { entitlement: value as Entitlement, cachedAtMs: Date.now() });
});
