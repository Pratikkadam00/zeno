import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { findServiceBySlug, searchServices, services } from "@zeno/service-catalog";
import { createBusinessSummary, createMockOpenBankingAdapter, createPublicApiKeyPreview, demoBusinessWorkspace, fail, listPartnerIntegrations, ok, syncPullSchema, syncPushSchema, type CurrencyCode, type OpenBankingProvider, type PublicApiKey } from "@zeno/shared";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { pingStorage } from "./storage/pg";
import Redis from "ioredis";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z, ZodError } from "zod";
import { authRoutes, revokeAllSessionsForAccount } from "./routes/auth";
import { createLinkToken, deletePlaidItem, exchangePublicToken, getRecentTransactions, getStoredPlaidItem, plaidConfigured, sandboxPublicToken, storePlaidItem } from "./plaid";
import { applyWebhookEvent, billingConfigured, deleteEntitlementForUser, fetchEntitlement, getCachedEntitlement, verifyWebhookAuth, webhookConfigured } from "./billing";
import { deleteUserSyncData, pullChanges, pushChanges, type EncryptedChange } from "./sync";
import { createHousehold, getHousehold, joinHousehold, removeMember, removeUserFromAllHouseholds, setMemberSpend, type Household } from "./family";
import { coachConfigured, coachModel, generateCoaching } from "./coach";
import { registerAuthGuard } from "./auth-guard";
import { markRequestStart, recordProductEvent, recordRequest, renderMetrics } from "./metrics";

export type BuildAppOptions = {
  logger?: boolean;
};

const DEFAULT_SERVICES_LIMIT = 25;
const MAX_SERVICES_LIMIT = 100;

// Per-route rate limits, tighter than the global 100/min/IP bucket, for endpoints
// that are expensive (call paid upstreams like Groq/Plaid) or abuse-prone.
const limit = (max: number) => ({ config: { rateLimit: { max, timeWindow: "1 minute" } } });

// Keyed by account instead of IP: an IP-keyed limit lets one attacker with one
// valid token evade it entirely by rotating source IPs, which matters here
// because every request calls a paid LLM upstream. Uses the "preHandler" hook
// (not the plugin's default "onRequest") so this runs after the auth guard's
// onRequest hook has set request.userId — coach is never a public route, so by
// the time preHandler runs, userId is always populated or the request already
// 401'd and never reached here.
const limitByAccount = (max: number) => ({
  config: {
    rateLimit: {
      max,
      timeWindow: "1 minute",
      hook: "preHandler" as const,
      keyGenerator: (req: FastifyRequest) => req.userId ?? req.ip
    }
  }
});

// How many proxy hops to trust for client-IP resolution (rate-limit keying).
// A number is safe (trusts exactly N upstream hops); `true` would trust any
// X-Forwarded-For and is intentionally avoided.
function resolveTrustProxy(): number | boolean {
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw !== undefined) {
    const hops = Number.parseInt(raw, 10);
    if (Number.isInteger(hops) && hops >= 0) return hops;
  }
  return process.env.NODE_ENV === "production" ? 1 : false;
}

// Build the shared rate-limit backing store from REDIS_URL, or null to use the
// in-process default. Tuned to fail fast (short timeout, 1 retry, no offline
// queue) so a Redis outage degrades quickly under skipOnError rather than hanging.
// Forward 5xx server errors to an optional alerting webhook (Slack/Discord/any
// collector). Fire-and-forget and inert without MONITORING_WEBHOOK_URL. Sends
// only the route PATTERN + message + request id — never the body, query, or
// headers — so no PII/secrets leak into the alert.
function reportServerError(error: unknown, request: FastifyRequest): void {
  const url = process.env.MONITORING_WEBHOOK_URL;
  if (!url) return;
  const payload = {
    service: "zeno-api",
    level: "error",
    message: error instanceof Error ? error.message : String(error),
    method: request.method,
    route: request.routeOptions?.url ?? "unknown",
    requestId: request.id
  };
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function createRateLimitRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const client = new Redis(url, {
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false
  });
  client.on("error", (err) => console.error("[redis] rate-limit store error:", err.message));
  return client;
}

// Kept in sync with CurrencyCode (packages/shared/src/domain.ts) in both
// directions: `satisfies` catches an extra/typo'd element (it only checks
// this array is assignable TO CurrencyCode[], not the reverse), and the
// exhaustiveness check below additionally fails typecheck if CURRENCY_CODES
// is ever missing a legitimate CurrencyCode member — so a drift either way
// (rejecting a real currency, or accepting a fake one) breaks the build
// instead of silently shipping.
const CURRENCY_CODES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"] as const satisfies readonly CurrencyCode[];
type MissingFromCurrencyCodes = Exclude<CurrencyCode, (typeof CURRENCY_CODES)[number]>;
// If this line errors, CurrencyCode has a member not listed in CURRENCY_CODES.
const _currencyCodesExhaustive: MissingFromCurrencyCodes extends never ? true : ["CURRENCY_CODES is missing:", MissingFromCurrencyCodes] = true;
void _currencyCodesExhaustive;
const currencyCodeSchema = z.enum(CURRENCY_CODES);

// Identity (ownerId / memberId) is taken from the verified token, NOT the body.
// currency is optional at the schema level (defaulting to "USD" in family.ts)
// so an not-yet-updated mobile client isn't hard-broken with a 400.
// Upper-bounded (100M currency units, in minor units) same as this codebase's
// other magnitude-capped numeric fields (see syncPushSchema's vectorClock in
// packages/shared/src/schemas.ts) — comfortably above any real household's
// spend, but rules out a value large enough to produce formatting/overflow
// surprises once combined across members.
const monthlySpendMinorSchema = z.number().int().min(0).max(100_000_000_00);
const familyCreateSchema = z.object({
  ownerName: z.string().min(1).max(80),
  monthlySpendMinor: monthlySpendMinorSchema.optional(),
  currency: currencyCodeSchema.optional()
});
const familyJoinSchema = z.object({
  shareCode: z.string().min(4).max(12),
  memberName: z.string().min(1).max(80),
  monthlySpendMinor: monthlySpendMinorSchema.optional(),
  currency: currencyCodeSchema.optional()
});
const familySpendSchema = z.object({
  monthlySpendMinor: monthlySpendMinorSchema,
  currency: currencyCodeSchema.optional()
});
// Shape-only validation — event/label are checked against the fixed allowlist
// in recordProductEvent (metrics.ts), not here, since that allowlist is the
// single source of truth shared with the Prometheus rendering.
const productEventSchema = z.object({
  event: z.string().min(1).max(64),
  label: z.string().min(1).max(64).optional()
});
const coachRequestSchema = z.object({
  totalMonthlyMinor: z.number().int().min(0),
  currency: currencyCodeSchema.optional(),
  subscriptions: z.array(z.object({
    name: z.string().min(1).max(80),
    category: z.string().min(1).max(40),
    monthlyMinor: z.number().int().min(0),
    billingCycle: z.string().min(1).max(20)
  })).max(200),
  insights: z.array(z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(600)
  })).max(20).optional(),
  question: z.string().max(500).optional(),
  budgetCapMinor: z.number().int().min(0).optional()
});
const revenueCatWebhookSchema = z.object({
  event: z.object({
    app_user_id: z.string().min(1).max(256),
    type: z.string().max(64).optional(),
    entitlement_ids: z.array(z.string().max(128)).max(50).optional(),
    expiration_at_ms: z.number().int().nonnegative().optional()
  }).passthrough()
}).passthrough();
// Real Plaid public tokens are short (well under 200 chars); 512 is a
// generous cap, bounding the value before it's forwarded verbatim into a
// server-to-server call to Plaid rather than relying on the 1MB bodyLimit alone.
const plaidExchangeSchema = z.object({ publicToken: z.string().min(1).max(512) });

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    genReqId: () => randomUUID(),
    // Behind a hosting proxy (Render) the socket peer is the load balancer, so the
    // rate limiter must read the real client IP from X-Forwarded-For. Trust a
    // BOUNDED hop count — never `true`, which would let a client spoof XFF and
    // rotate its own limiter key. Default: 1 proxy hop in production, no trust
    // locally/in tests. Override with TRUST_PROXY_HOPS.
    trustProxy: resolveTrustProxy(),
    // Cut off slow-loris clients that hold a request open (Fastify's default
    // requestTimeout is 0 = disabled). 30s is generous even for the coach route.
    requestTimeout: 30_000,
    // Explicit body cap (Fastify defaults to 1 MB; make it deliberate). The
    // largest schema-bounded route (sync/push) is ~800 KB, so 1 MB is ample.
    bodyLimit: 1_048_576
  });

  // Expose the request id as a response header so a client (or a proxy that
  // returns a non-JSON error) can always correlate to the server logs, not just
  // via the JSON envelope's meta.requestId.
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    markRequestStart();
  });

  // Record count + latency + in-flight for every response (including 404s and
  // errors). Uses the route PATTERN, never the raw URL, so path params don't
  // explode metric cardinality or leak ids.
  app.addHook("onResponse", async (request, reply) => {
    recordRequest(
      request.method,
      request.routeOptions?.url ?? "unmatched",
      reply.statusCode,
      reply.elapsedTime
    );
  });

  // Security headers (HSTS, nosniff, frame-deny, referrer policy, etc.). This is
  // a JSON API with no first-party HTML, so a strict default CSP is fine.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"]
      }
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "no-referrer" }
  });
  const allowedOrigins = readAllowedOrigins();
  await app.register(cors, {
    origin: (origin, callback) => {
      // Requests without an Origin header (mobile app, server-to-server) are not CORS requests.
      if (!origin || allowedOrigins.includes(origin) || isDevLocalhostOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed."), false);
    }
  });
  // Optional shared rate-limit store. With REDIS_URL set, counters live in Redis
  // so the limit holds ACROSS instances (the in-memory default is per-process and
  // multiplies with replicas). skipOnError keeps the API up if Redis blips — it
  // degrades to allowing requests rather than 500ing them. Inert without REDIS_URL.
  const rateLimitRedis = createRateLimitRedis();
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    ...(rateLimitRedis ? { redis: rateLimitRedis, nameSpace: "zeno-rl:", skipOnError: true } : {}),
    // The plugin throws this return value; Fastify routes it through the error
    // handler below, which serializes `envelope` as the standard fail response.
    errorResponseBuilder: (request, context) => {
      const error = new Error(`Rate limit exceeded, retry in ${context.after}.`) as RateLimitEnvelopeError;
      error.statusCode = context.statusCode;
      error.envelope = fail("RATE_LIMITED", `Rate limit exceeded, retry in ${context.after}.`, request.id, {
        max: context.max,
        ttl: context.ttl
      });
      return error;
    }
  });
  // Fail-closed identity guard: protects every route except the public/webhook
  // allowlist. Registered before routes so it covers all of them.
  registerAuthGuard(app);
  await app.register(authRoutes, { prefix: "/api/v1" });

  // Liveness: the process is up (used by Render's healthCheckPath). Always 200.
  app.get("/health", async (request) => ok({ status: "ok", service: "zeno-api" }, request.id));
  app.get("/api/v1/health", async (request) => ok({ status: "ok", service: "zeno-api" }, request.id));

  // Readiness: the process is up AND its critical stateful dependency (Postgres,
  // when configured) is reachable. Returns 503 if the DB is configured but down,
  // so a readiness probe can route traffic away from a degraded instance.
  // "skipped" (no DB → in-memory mode) is a valid ready state. Redis is excluded
  // on purpose: the rate limiter fails open, so a Redis blip doesn't make us "not ready".
  const readiness = async (request: FastifyRequest, reply: FastifyReply) => {
    const postgres = await pingStorage();
    const ready = postgres !== "error";
    if (!ready) reply.code(503);
    return ready
      ? ok({ status: "ready", checks: { postgres } }, request.id)
      : fail("SERVICE_UNAVAILABLE", "A required dependency is unavailable.", request.id, { checks: { postgres } });
  };
  app.get("/health/ready", readiness);
  app.get("/api/v1/health/ready", readiness);

  // Prometheus metrics (request counts, latency, in-flight). Public route in the
  // auth guard, but gated here by METRICS_TOKEN. In production the token is
  // REQUIRED (fail closed — an unset token returns 401, never an open scrape
  // surface); dev/local stays open when unset. Aggregate counters only.
  app.get("/metrics", async (request, reply) => {
    const token = process.env.METRICS_TOKEN;
    const inProduction = process.env.NODE_ENV === "production";
    if (token || inProduction) {
      const provided = request.headers.authorization?.startsWith("Bearer ")
        ? request.headers.authorization.slice(7).trim()
        : null;
      if (!token || !provided || !constantTimeEquals(provided, token)) {
        reply.code(401);
        return fail("UNAUTHORIZED", "Invalid metrics token.", request.id);
      }
    }
    reply.header("content-type", "text/plain; version=0.0.4; charset=utf-8");
    return renderMetrics();
  });

  // Aggregate, anonymous product-funnel events (Phase 5.3): import completion,
  // share-card generation, hitting the free-tier import cap, paywall→purchase
  // by SKU. Public/unauthenticated — local-only (no-account) users must be
  // able to call this too — and deliberately does not read request.userId even
  // when a caller happens to be signed in, so no event is ever linked to an
  // account. event/label are validated against a fixed allowlist in
  // recordProductEvent, so a public endpoint can't inject arbitrary-cardinality
  // data into the in-memory counters.
  app.post("/api/v1/events", limit(60), async (request, reply) => {
    const parsed = parseBody(productEventSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const recorded = recordProductEvent(parsed.data.event, parsed.data.label);
    if (!recorded) {
      reply.code(400);
      return fail("BAD_REQUEST", "Unknown event or label.", request.id);
    }
    return ok({ recorded: true }, request.id);
  });

  app.get("/api/v1/account", async (request) => ok({
    accountId: request.userId,
    plan: "free",
    serverStoresFinancialData: false
  }, request.id));

  // Account deletion: purges every server-side kv_store namespace tied to this
  // account (entitlement cache, Plaid item, synced entities, household
  // membership) and revokes every refresh/magic-link session immediately — a
  // refresh attempt right after this call is already rejected. The device's
  // local SQLite data is wiped separately, client-side (settings.tsx). Rate-
  // limited low: this is a destructive, rarely-called action, not a hot path.
  app.delete("/api/v1/account", limit(5), async (request) => {
    const userId = request.userId!;
    deleteEntitlementForUser(userId);
    deletePlaidItem(userId);
    deleteUserSyncData(userId);
    removeUserFromAllHouseholds(userId);
    await revokeAllSessionsForAccount(userId);
    return ok({ deleted: true }, request.id);
  });

  app.get("/api/v1/services", async (request) => {
    const rawQuery = typeof request.query === "object" && request.query ? request.query as Record<string, unknown> : {};
    const query = String(rawQuery.q ?? "").slice(0, 100);
    const limit = clampInt(rawQuery.limit, DEFAULT_SERVICES_LIMIT, 1, MAX_SERVICES_LIMIT);
    const offset = clampInt(rawQuery.offset, 0, 0, Number.MAX_SAFE_INTEGER);

    // Matching set: full catalog for unfiltered requests, ranked results for a query.
    const matches = query ? searchServices(query, services.length) : services;
    const page = matches.slice(offset, offset + limit);

    return ok({
      services: page,
      total: matches.length,
      limit,
      offset,
      returned: page.length
    }, request.id);
  });

  app.get("/api/v1/services/:slug", async (request, reply) => {
    const slug = typeof request.params === "object" && request.params && "slug" in request.params
      ? String((request.params as { slug?: unknown }).slug ?? "")
      : "";
    const service = findServiceBySlug(slug);
    if (!service) {
      reply.code(404);
      return fail("NOT_FOUND", "Service not found.", request.id);
    }
    return ok({ service }, request.id);
  });

  app.get("/api/v1/capabilities", async (request) => ok({
    phase: "phase_6_intelligence_scale",
    serverStoresFinancialData: false,
    capabilities: [
      "top_50_service_catalog",
      "service_cancellation_guides",
      // Cloud sync/backup is intentionally NOT advertised (P2.4): the sync
      // endpoints exist but store an opaque payload without client-side
      // encryption yet, so we do not claim "encrypted sync" until P6 ships real
      // end-to-end encryption. Re-add an accurate capability string then.
      "local_email_receipt_parsing_architecture",
      "local_spend_coach_architecture",
      "ai_spend_coach_when_configured",
      "renewal_reminder_plan_7_3_day_of",
      "open_banking_provider_adapters",
      "spend_twin",
      "family_vault",
      "analytics_snapshot",
      "widget_watch_snapshot",
      "business_tier_contracts",
      "public_api_key_model",
      "partner_integration_manifests"
    ]
  }, request.id));

  app.get("/api/v1/widgets/snapshot", async (request) => ok({
    snapshotContract: {
      generatedAt: new Date().toISOString(),
      nextRenewal: null,
      monthlySpendLabel: "$0.00",
      activeCount: 0,
      watchComplicationText: "No renewals"
    },
    note: "Production native widgets will read a local encrypted snapshot, not server financial data."
  }, request.id));

  app.get("/api/v1/business/summary", async (request) => ok({
    summary: createBusinessSummary(demoBusinessWorkspace, []),
    serverStoresFinancialData: false
  }, request.id));

  app.get("/api/v1/public-api/keys", async (request) => {
    const key: PublicApiKey = {
      id: "key_dev_docs",
      label: "Dev docs key",
      prefix: "sr_dev",
      scopes: ["subscriptions:read", "services:read", "analytics:read"],
      createdAt: "2026-05-24T00:00:00.000Z"
    };
    return ok({ keys: [createPublicApiKeyPreview(key)] }, request.id);
  });

  app.get("/api/v1/partners", async (request) => ok({
    integrations: listPartnerIntegrations()
  }, request.id));

  app.get("/api/v1/open-banking/providers", async (request) => ok({
    providers: [
      { id: "plaid", mode: "dev_adapter", scopes: ["transactions_read"], serverSeesCredentials: false },
      { id: "mx", mode: "dev_adapter", scopes: ["transactions_read"], serverSeesCredentials: false }
    ]
  }, request.id));

  app.post("/api/v1/open-banking/:provider/intent", limit(20), async (request, reply) => {
    const provider = readProviderParam(request.params);
    if (!provider) {
      reply.code(400);
      return fail("BAD_REQUEST", "Provider must be plaid or mx.", request.id);
    }

    const adapter = createMockOpenBankingAdapter(provider);
    const intent = await adapter.createConnectionIntent({
      provider,
      accountId: request.userId!,
      redirectUri: "zeno://bank-connected"
    });

    return ok({ intent }, request.id);
  });

  // ── Family / household sharing (share-code join + combined spend view). ──
  app.post("/api/v1/family/create", limit(10), async (request, reply) => {
    const parsed = parseBody(familyCreateSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    // Owner is the authenticated caller — never a client-supplied id.
    const household = createHousehold(request.userId!, parsed.data.ownerName, parsed.data.monthlySpendMinor ?? 0, parsed.data.currency ?? "USD");
    if (!household) {
      reply.code(409);
      return fail("CONFLICT", "Household limit reached for this account.", request.id);
    }
    return ok({ household }, request.id);
  });

  app.post("/api/v1/family/join", limit(10), async (request, reply) => {
    const parsed = parseBody(familyJoinSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    // The joining member is the authenticated caller.
    const household = joinHousehold(parsed.data.shareCode, request.userId!, parsed.data.memberName, parsed.data.monthlySpendMinor ?? 0, parsed.data.currency ?? "USD");
    if (!household) {
      reply.code(404);
      return fail("NOT_FOUND", "No household found for that code.", request.id);
    }
    return ok({ household }, request.id);
  });

  app.get("/api/v1/family/:householdId", async (request, reply) => {
    const householdId = (request.params as { householdId?: string }).householdId ?? "";
    const household = getHousehold(householdId);
    if (!household) {
      reply.code(404);
      return fail("NOT_FOUND", "Household not found.", request.id);
    }
    // AUTHORIZATION: a valid token is not enough — the caller must belong to this
    // household. Otherwise a logged-in user could read any household by id.
    if (!isHouseholdMember(household, request.userId)) {
      reply.code(403);
      return fail("FORBIDDEN", "You are not a member of this household.", request.id);
    }
    return ok({ household }, request.id);
  });

  app.post("/api/v1/family/:householdId/spend", limit(30), async (request, reply) => {
    const householdId = (request.params as { householdId?: string }).householdId ?? "";
    const parsed = parseBody(familySpendSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const existing = getHousehold(householdId);
    if (!existing) {
      reply.code(404);
      return fail("NOT_FOUND", "Household not found.", request.id);
    }
    // Must be a member, and may only set OWN spend (member id = the caller).
    if (!isHouseholdMember(existing, request.userId)) {
      reply.code(403);
      return fail("FORBIDDEN", "You are not a member of this household.", request.id);
    }
    const household = setMemberSpend(householdId, request.userId!, parsed.data.monthlySpendMinor, parsed.data.currency);
    return ok({ household }, request.id);
  });

  app.post("/api/v1/family/:householdId/leave", limit(20), async (request, reply) => {
    const householdId = (request.params as { householdId?: string }).householdId ?? "";
    const existing = getHousehold(householdId);
    if (!existing) {
      reply.code(404);
      return fail("NOT_FOUND", "Household not found.", request.id);
    }
    if (!isHouseholdMember(existing, request.userId)) {
      reply.code(403);
      return fail("FORBIDDEN", "You are not a member of this household.", request.id);
    }
    // household is null when the caller was the last member (household disbanded).
    const household = removeMember(householdId, request.userId!);
    return ok({ household }, request.id);
  });

  // ── AI spend coach. Live when ANTHROPIC_API_KEY is set; otherwise reports
  //    "unconfigured" so the client falls back to local rule-based insights. ──
  app.post("/api/v1/coach", limitByAccount(10), async (request, reply) => {
    const parsed = parseBody(coachRequestSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    if (!coachConfigured()) {
      return ok({ source: "unconfigured" as const, model: coachModel() }, request.id);
    }
    try {
      return ok(await generateCoaching(parsed.data), request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "AI coach request failed.", request.id);
    }
  });

  // ── Billing entitlement (server is the source of truth for Pro/Family). ──
  app.get("/api/v1/billing/entitlement", limit(30), async (request, reply) => {
    // The RevenueCat app_user_id is the authenticated account — never a client
    // query param (which previously let anyone probe any user's plan).
    const appUserId = request.userId!;
    const cached = getCachedEntitlement(appUserId);
    if (cached) {
      return ok(cached, request.id);
    }
    if (!billingConfigured()) {
      return ok({ plan: "free", active: false, expiresAt: null, source: "unconfigured" }, request.id);
    }
    try {
      return ok(await fetchEntitlement(appUserId), request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Entitlement lookup failed.", request.id);
    }
  });

  app.post("/api/v1/billing/webhook", limit(30), async (request, reply) => {
    if (!webhookConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Billing webhook is not configured.", request.id);
    }
    if (!verifyWebhookAuth(request.headers.authorization)) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Invalid webhook authorization.", request.id);
    }
    const parsed = parseBody(revenueCatWebhookSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    applyWebhookEvent(parsed.data);
    return ok({ received: true }, request.id);
  });

  // ── Plaid (optional bank connect). Live when PLAID_CLIENT_ID/SECRET are set,
  //    otherwise these report not-configured so the client stays in mock mode. ──
  app.post("/api/v1/plaid/link-token", limit(10), async (request, reply) => {
    if (!plaidConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Bank connect is not configured on this server.", request.id);
    }
    try {
      // Identity comes from the verified token, NOT the body — matches every
      // other identity-bearing route in this file (see /plaid/exchange below).
      return ok(await createLinkToken(request.userId!), request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Plaid request failed.", request.id);
    }
  });

  app.post("/api/v1/plaid/exchange", limit(10), async (request, reply) => {
    if (!plaidConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Bank connect is not configured on this server.", request.id);
    }
    const parsed = parseBody(plaidExchangeSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    try {
      // The access token is bank-access credential — store it server-side keyed
      // to the authenticated user and return ONLY the (non-sensitive) item id.
      const { accessToken, itemId } = await exchangePublicToken(parsed.data.publicToken);
      storePlaidItem(request.userId!, { accessToken, itemId });
      return ok({ itemId, connected: true }, request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Plaid request failed.", request.id);
    }
  });

  app.post("/api/v1/plaid/transactions", limit(20), async (request, reply) => {
    if (!plaidConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Bank connect is not configured on this server.", request.id);
    }
    // No access token from the client — look up this user's stored Plaid item.
    const item = getStoredPlaidItem(request.userId!);
    if (!item) {
      reply.code(409);
      return fail("CONFLICT", "No linked bank account. Connect a bank first.", request.id);
    }
    try {
      const transactions = await getRecentTransactions(item.accessToken);
      return ok({ transactions, count: transactions.length }, request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Plaid request failed.", request.id);
    }
  });

  // Sandbox-only convenience: mint a public token without the native Link UI so
  // the connect→exchange→transactions flow is testable end-to-end in sandbox.
  app.post("/api/v1/plaid/sandbox/public-token", limit(10), async (request, reply) => {
    if (!plaidConfigured() || (process.env.PLAID_ENV ?? "sandbox") !== "sandbox") {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Sandbox token minting is only available in sandbox mode.", request.id);
    }
    try {
      return ok({ publicToken: await sandboxPublicToken() }, request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Plaid request failed.", request.id);
    }
  });

  app.get("/api/v1/sync/pull", limit(60), async (request, reply) => {
    const userId = request.userId!;
    const parsed = parseBody(syncPullSchema, request.query, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const result = pullChanges(userId, parsed.data.cursor, parsed.data.limit);
    return ok({
      encryptedChanges: result.changes,
      cursor: result.cursor,
      hasMore: result.hasMore,
      serverStoresFinancialData: false
    }, request.id);
  });

  app.post("/api/v1/sync/push", limit(60), async (request, reply) => {
    const userId = request.userId!;
    const parsed = parseBody(syncPushSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const result = await pushChanges(userId, parsed.data.encryptedChanges as EncryptedChange[]);
    return ok({ ...result, serverStoresFinancialData: false }, request.id);
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(fail("NOT_FOUND", "Route not found.", request.id));
  });

  app.setErrorHandler((error, request, reply) => {
    // Rate-limit rejections carry a pre-built fail envelope and a 429/403 status.
    const envelopeError = error as Partial<RateLimitEnvelopeError>;
    if (envelopeError.envelope && typeof envelopeError.statusCode === "number") {
      reply.code(envelopeError.statusCode).send(envelopeError.envelope);
      return;
    }
    request.log.error(error);
    reportServerError(error, request);
    reply.code(500).send(fail("INTERNAL", "Unexpected server error.", request.id));
  });

  return app;
}

// Length-safe constant-time string comparison — timingSafeEqual throws on
// unequal-length buffers, so compare a fixed-size digest of each side to avoid
// both the throw and leaking the token length via early return.
function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

type RateLimitEnvelopeError = Error & {
  statusCode: number;
  envelope: ReturnType<typeof fail>;
};

type ParseResult<T extends z.ZodType> =
  | { ok: true; data: z.infer<T> }
  | { ok: false; error: ReturnType<typeof fail> };

function parseBody<T extends z.ZodType>(schema: T, body: unknown, requestId: string): ParseResult<T> {
  try {
    return { ok: true, data: schema.parse(body) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        error: fail("BAD_REQUEST", "Request validation failed.", requestId, {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        })
      };
    }
    return { ok: false, error: fail("BAD_REQUEST", "Request validation failed.", requestId) };
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

// A caller belongs to a household if they own it or are listed as a member.
// Used to authorize household reads/writes against the verified token's user id.
function isHouseholdMember(household: Household, userId: string | undefined): boolean {
  if (!userId) return false;
  return household.ownerId === userId || household.members.some((member) => member.id === userId);
}

function readAllowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isDevLocalhostOrigin(origin: string): boolean {
  return process.env.NODE_ENV !== "production"
    && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function readProviderParam(params: unknown): OpenBankingProvider | null {
  const value = typeof params === "object" && params && "provider" in params
    ? String((params as { provider?: unknown }).provider)
    : "";
  return value === "plaid" || value === "mx" ? value : null;
}
