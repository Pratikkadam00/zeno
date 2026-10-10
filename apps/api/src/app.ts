import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { findServiceBySlug, searchServices, services } from "@zeno/service-catalog";
import { createBusinessSummary, createMockOpenBankingAdapter, createPublicApiKeyPreview, demoBusinessWorkspace, fail, listPartnerIntegrations, ok, syncPullSchema, syncPushSchema, type CurrencyCode, type OpenBankingProvider, type PublicApiKey } from "@zeno/shared";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest, type FastifyServerOptions } from "fastify";
import { pingStorage } from "./storage/pg";
import { Readable } from "node:stream";
import Redis from "ioredis";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { authRoutes, revokeAccessTokensForAccount, revokeAllSessionsForAccount, verifyAccessToken } from "./routes/auth";
import { createLinkToken, deletePlaidItem, exchangePublicToken, getRecentTransactions, getStoredPlaidItem, plaidConfigured, sandboxPublicToken, storePlaidItem } from "./plaid";
import { billingConfigured, deleteEntitlementForUser, fetchEntitlement, getCachedEntitlement, verifyWebhookAuth, webhookConfigured } from "./billing";
import { claimEvent, grantWindow, razorpayWebhookConfigured, recordWebGrant, revokeWebGrantByPayment, verifyRazorpaySignature } from "./billing-razorpay";
import { deleteUserSyncData, pullChanges, pushChanges, type EncryptedChange } from "./sync";
import { createHousehold, getHousehold, joinHousehold, removeMember, removeUserFromAllHouseholds, setMemberSpend, type Household } from "./family";
import { coachConfigured, coachModel, generateCoaching } from "./coach";
import { securityEvent } from "./security-events";
import { registerAuthGuard } from "./auth-guard";
import { markRequestStart, recordProductEvent, recordRequest, renderMetrics } from "./metrics";
import { fetchWithTimeout } from "./http";

export type BuildAppOptions = {
  // boolean for tests (true/false), or a full pino config for production
  // (explicit level + redaction) — see server.ts.
  logger?: FastifyServerOptions["logger"];
};

const DEFAULT_SERVICES_LIMIT = 25;
const MAX_SERVICES_LIMIT = 100;

// Per-route rate limits, tighter than the global 100/min/IP bucket, for endpoints
// that are expensive (call paid upstreams like Groq/Plaid) or abuse-prone.
const limit = (max: number) => ({ config: { rateLimit: { max, timeWindow: "1 minute" } } });

// ONE limiter keyed per request (finding F78): a request with a VALID access
// token is keyed by its account, so one attacker with one token cannot evade
// the limit by rotating source IPs (every coach request calls a paid LLM
// upstream); any other request is keyed by its IP, so an unauthenticated flood
// is capped too. It runs in onRequest, before the auth guard, because the
// rate-limit plugin applies only the FIRST limiter that runs for a request
// (req[rateLimitRan]): a second, stacked limiter is silently skipped. So the
// token is checked here as well as in the guard: a cheap signature check.
/** @internal exported for tests. */
export function accountRateLimitKey(req: FastifyRequest): string {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return verifyAccessToken(token)?.sub ?? req.ip;
}

const limitByAccount = (max: number) => ({
  config: {
    rateLimit: {
      max,
      timeWindow: "1 minute",
      keyGenerator: accountRateLimitKey
    }
  }
});

// Client-IP resolution for rate-limit keying: trust exactly N proxy hops, so
// request.ip is the address the Nth proxy APPENDED — never a value the client
// wrote into X-Forwarded-For. Default: 1 hop in production (the platform load
// balancer), none elsewhere. Override with TRUST_PROXY_HOPS (0–MAX_TRUST_HOPS).
//
// Stated as a function on purpose. Fastify >= 5.12 treats a NUMERIC trustProxy
// as "trust nobody" (it cannot validate the immediate peer), which silently made
// request.ip the load balancer for every visitor — one shared rate-limit bucket
// for all users — when the 2026-09-29 dependency patch pulled in 5.12.5. Hop
// count is sound here because the API is reachable only through the platform
// proxy (the immediate peer is always that proxy); if the API ever becomes
// directly reachable, switch to an IP/CIDR allowlist. `true` (trust any chain)
// stays banned: it lets a client rotate its own limiter key.
// Pinned by trust-proxy.test.ts.
const MAX_TRUST_HOPS = 5;

export function readTrustProxyHops(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TRUST_PROXY_HOPS?.trim();
  if (raw !== undefined && /^\d+$/.test(raw)) {
    const hops = Number(raw);
    if (hops <= MAX_TRUST_HOPS) return hops;
  }
  return env.NODE_ENV === "production" ? 1 : 0;
}

function resolveTrustProxy(): false | ((address: string, hop: number) => boolean) {
  const hops = readTrustProxyHops();
  if (hops === 0) return false;
  // proxy-addr calls this for the socket peer (hop 0) and then each
  // X-Forwarded-For entry from the right (hop 1, 2, …); the first untrusted
  // address becomes request.ip.
  return (_address: string, hop: number) => hop < hops;
}

// Build the shared rate-limit backing store from REDIS_URL, or null to use the
// in-process default. Tuned to fail fast (short timeout, 1 retry, no offline
// queue) so a Redis outage degrades quickly under skipOnError rather than hanging.
// Forward 5xx server errors to an optional alerting webhook (Slack/Discord/any
// collector). Fire-and-forget and inert without MONITORING_WEBHOOK_URL. Sends
// only the route PATTERN + message + request id — never the body, query, or
// headers — so no PII/secrets leak into the alert.
//
// Bounded like every other outbound call (finding F82). During an outage every
// request can fail, and each failure used to open one alert request with no
// deadline of ours (undici's own is 300 s for headers), so a slow or hung
// collector held one socket per failed request. Each alert now has a 3 s
// deadline, and at most 5 are in flight; the rest are dropped (every 5xx is
// still logged at error level).
const ALERT_TIMEOUT_MS = 3000;
const MAX_ALERTS_IN_FLIGHT = 5;
let alertsInFlight = 0;

function reportServerError(error: unknown, request: FastifyRequest): void {
  const url = process.env.MONITORING_WEBHOOK_URL;
  if (!url || alertsInFlight >= MAX_ALERTS_IN_FLIGHT) return;
  alertsInFlight += 1;
  const payload = {
    service: "zeno-api",
    level: "error",
    message: error instanceof Error ? error.message : String(error),
    method: request.method,
    route: request.routeOptions?.url ?? "unknown",
    requestId: request.id
  };
  void fetchWithTimeout(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }, ALERT_TIMEOUT_MS).catch(() => {}).finally(() => {
    alertsInFlight -= 1;
  });
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
export const familyCreateSchema = z.object({
  ownerName: z.string().min(1).max(80),
  monthlySpendMinor: monthlySpendMinorSchema.optional(),
  currency: currencyCodeSchema.optional()
});
export const familyJoinSchema = z.object({
  shareCode: z.string().min(4).max(12),
  memberName: z.string().min(1).max(80),
  monthlySpendMinor: monthlySpendMinorSchema.optional(),
  currency: currencyCodeSchema.optional()
});
export const familySpendSchema = z.object({
  monthlySpendMinor: monthlySpendMinorSchema,
  currency: currencyCodeSchema.optional()
});
// Shape-only validation — event/label are checked against the fixed allowlist
// in recordProductEvent (metrics.ts), not here, since that allowlist is the
// single source of truth shared with the Prometheus rendering.
export const productEventSchema = z.object({
  event: z.string().min(1).max(64),
  label: z.string().min(1).max(64).optional()
});
export const coachRequestSchema = z.object({
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
// P2.8: only the app user id is read (finding F85: the payload is not trusted).
// RevenueCat's other fields (type, entitlement_ids, expiration_at_ms, ...) are
// therefore not validated either: a value we would have rejected made
// RevenueCat retry 5 times and then drop the event, so the re-verification it
// signals never happened.
export const revenueCatWebhookSchema = z.object({
  event: z.object({ app_user_id: z.string().min(1).max(256) }).passthrough()
}).passthrough();
// Real Plaid public tokens are short (well under 200 chars); 512 is a
// generous cap, bounding the value before it's forwarded verbatim into a
// server-to-server call to Plaid rather than relying on the 1MB bodyLimit alone.
// Razorpay signs the body, so unlike RevenueCat's payload (F85) this one is
// acted on. Only the fields we use are read; the rest passes through, because a
// value we rejected would make Razorpay retry and then give up, losing a
// purchase that really happened. `notes` is ours: we set it when creating the
// order, so accountId and product come from us, not from the buyer.
export const razorpayWebhookSchema = z.object({
  event: z.string().min(1).max(64),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(1).max(128),
        amount: z.number().int().min(0),
        currency: z.string().min(3).max(8),
        notes: z.object({
          accountId: z.string().min(1).max(128).optional(),
          product: z.enum(["pro_annual", "pro_lifetime", "family_annual"]).optional()
        }).passthrough().optional()
      }).passthrough()
    }).optional(),
    refund: z.object({
      entity: z.object({
        id: z.string().min(1).max(128),
        payment_id: z.string().min(1).max(128)
      }).passthrough()
    }).optional()
  }).passthrough()
}).passthrough();
export const plaidExchangeSchema = z.object({ publicToken: z.string().min(1).max(512) });

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
    bodyLimit: 1_048_576,
    // Prototype poisoning: a JSON body with a `__proto__` or
    // `constructor.prototype` key is rejected at the parser (400), before any
    // handler sees it. These are Fastify's defaults today; stated here so a
    // future default change cannot silently remove the protection (P2.4,
    // pinned by fuzz.test.ts).
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error"
  });

  // Set FIRST, before any plugin registers routes (finding F79). A plugin that
  // is awaited builds its routes at once, and each route keeps the error
  // handler that existed THEN: registered at the end, this handler never
  // reached the auth routes, which answered with Fastify's default handler (a
  // non-envelope 429, framework error codes on malformed JSON, and no 5xx
  // alerting).
  app.setErrorHandler((error, request, reply) => {
    // Rate-limit rejections carry a pre-built fail envelope and a 429/403 status.
    const envelopeError = error as Partial<RateLimitEnvelopeError>;
    if (envelopeError.envelope && typeof envelopeError.statusCode === "number") {
      reply.code(envelopeError.statusCode).send(envelopeError.envelope);
      return;
    }
    // Fastify's own CLIENT errors (malformed JSON, a body over the limit, an
    // unsupported content type) carry a 4xx statusCode. They are the caller's
    // fault: answer with that status and a fixed message, and never log them as
    // server errors or page the monitoring webhook. Before, every one was a 500
    // plus an alert, which anyone could trigger with a bad body (finding F33).
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === "number" && status >= 400 && status < 500) {
      reply.code(status).send(fail("BAD_REQUEST", clientErrorMessage(status), request.id));
      return;
    }
    request.log.error(error);
    reportServerError(error, request);
    reply.code(500).send(fail("INTERNAL", "Unexpected server error.", request.id));
  });

  // Expose the request id as a response header so a client (or a proxy that
  // returns a non-JSON error) can always correlate to the server logs, not just
  // via the JSON envelope's meta.requestId.
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    // Answers carry tokens and a user's data: no cache may keep one (ASVS
    // V14.3.2, F217). Set first, so every answer has it, errors included.
    reply.header("cache-control", "no-store");
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
    const householdId = (request.params as { householdId?: unknown } | undefined)?.householdId;
    const security = securityEvent(request.routeOptions?.url ?? "unmatched", reply.statusCode, request.signedInAccount ?? request.userId, {
      httpMethod: request.method,
      ...(typeof householdId === "string" ? { householdId } : {})
    });
    if (security) request.log.info({ security }, "security event");
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
      // A disallowed origin gets no CORS headers, so the browser withholds the
      // response. It is NOT an error: passing one here made every such request a
      // 500 plus an error log plus a monitoring alert, which any web page could
      // trigger at will (finding F30).
      callback(null, !origin || allowedOrigins.includes(origin) || isDevLocalhostOrigin(origin));
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

  // No "serverStoresFinancialData: false" here or anywhere else (finding F32):
  // the server DOES store family members' monthly spend and sync payloads, so
  // the flag was false for any household member or syncing device.
  app.get("/api/v1/account", async (request) => ok({
    accountId: request.userId,
    plan: "free"
  }, request.id));

  // Account deletion: purges every server-side kv_store namespace tied to this
  // account (entitlement cache, Plaid item, synced entities, household
  // membership) and revokes every refresh/magic-link session immediately — a
  // refresh attempt right after this call is already rejected. The device's
  // local SQLite data is wiped separately, client-side (settings.tsx). Rate-
  // limited low: this is a destructive, rarely-called action, not a hot path.
  // "deleted: true" is said only once every step is DURABLE in Postgres: each
  // step resolves after its rows are gone (false if the database refused). The
  // steps used to be fire-and-forget, so the answer could arrive while rows
  // were still in the database, and a crash then resurrected the "deleted"
  // account's data on the next boot (finding F75). A refused step answers 503:
  // the app does not wipe the device or tell the user it is done, and a retry
  // finds whatever is left because the steps delete from the database, not
  // from an in-memory index that already forgot the rows.
  app.delete("/api/v1/account", limit(5), async (request, reply) => {
    const userId = request.userId!;
    const durable = await Promise.all([
      deleteEntitlementForUser(userId),
      deletePlaidItem(userId),
      deleteUserSyncData(userId),
      removeUserFromAllHouseholds(userId),
      revokeAllSessionsForAccount(userId)
    ]);
    // Then, and only then, every access token already issued for the account
    // stops working, so it cannot re-create data (finding F76). Last on
    // purpose: a refused step above leaves the token able to retry.
    if (durable.includes(false) || !(await revokeAccessTokensForAccount(userId))) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Account deletion could not be completed. Please try again.", request.id);
    }
    return ok({ deleted: true }, request.id);
  });

  app.get("/api/v1/services", async (request, reply) => {
    // Fastify always parses the query string into an object ({} when empty).
    const rawQuery = request.query as Record<string, unknown>;
    // A parameter given twice arrives as an array, which String() would join
    // ("q=net&q=hulu" searched "net,hulu"). Refuse it rather than guess which
    // one was meant (ASVS V15.3.5, V15.3.7; F219).
    const repeated = ["q", "limit", "offset"].find((name) => Array.isArray(rawQuery[name]));
    if (repeated) {
      reply.code(400);
      return fail("BAD_REQUEST", `"${repeated}" was given more than once.`, request.id);
    }
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
    const { slug } = request.params as { slug: string };
    const service = findServiceBySlug(slug);
    if (!service) {
      reply.code(404);
      return fail("NOT_FOUND", "Service not found.", request.id);
    }
    return ok({ service }, request.id);
  });

  app.get("/api/v1/capabilities", async (request) => ok({
    phase: "phase_6_intelligence_scale",
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
    summary: createBusinessSummary(demoBusinessWorkspace, [])
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
    const { householdId } = request.params as { householdId: string };
    const household = getHousehold(householdId);
    if (!household) {
      reply.code(404);
      return fail("NOT_FOUND", "Household not found.", request.id);
    }
    // AUTHORIZATION: a valid token is not enough — the caller must belong to this
    // household. Otherwise a logged-in user could read any household by id.
    if (!isHouseholdMember(household, request.userId!)) {
      reply.code(403);
      return fail("FORBIDDEN", "You are not a member of this household.", request.id);
    }
    return ok({ household }, request.id);
  });

  app.post("/api/v1/family/:householdId/spend", limit(30), async (request, reply) => {
    const { householdId } = request.params as { householdId: string };
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
    if (!isHouseholdMember(existing, request.userId!)) {
      reply.code(403);
      return fail("FORBIDDEN", "You are not a member of this household.", request.id);
    }
    const household = setMemberSpend(householdId, request.userId!, parsed.data.monthlySpendMinor, parsed.data.currency);
    return ok({ household }, request.id);
  });

  app.post("/api/v1/family/:householdId/leave", limit(20), async (request, reply) => {
    const { householdId } = request.params as { householdId: string };
    const existing = getHousehold(householdId);
    if (!existing) {
      reply.code(404);
      return fail("NOT_FOUND", "Household not found.", request.id);
    }
    if (!isHouseholdMember(existing, request.userId!)) {
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
      return upstreamFailure(request, reply, error, "AI coach request failed.");
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
      return upstreamFailure(request, reply, error, "Entitlement lookup failed.");
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
    // F85. RevenueCat retries a failed delivery up to 5 times over about 2.5
    // hours and may deliver twice, so an event can arrive after newer ones; and
    // its header is a static secret, not a signature over the body. So, as
    // RevenueCat recommends, a webhook only means "re-verify this user": the
    // cached entitlement is dropped (durably, before RevenueCat hears 200) and
    // the next read asks GET /subscribers. Idempotent and order-independent by
    // construction; a forged or replayed event can cause one extra lookup, no
    // grant.
    if (!(await deleteEntitlementForUser(parsed.data.event.app_user_id))) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Could not record the billing event. Please retry.", request.id);
    }
    return ok({ received: true }, request.id);
  });

  // Razorpay's webhook for the website's own checkout (P6 / D24). Unlike
  // RevenueCat's, this one is SIGNED over the body, so the payload can be acted
  // on rather than merely treated as "re-verify this user" — there is no third
  // party to re-ask. The signature is over the RAW bytes, which the preParsing
  // hook below keeps hold of.
  app.post("/api/v1/billing/razorpay/webhook", {
    ...limit(60),
    // Fastify hands the parser a stream; this reads it, stashes the exact bytes
    // and returns them again so the normal JSON parser still runs. Scoped to
    // this route: a global content-type parser would change every endpoint.
    preParsing: async (request, _reply, payload) => {
      const chunks: Buffer[] = [];
      // Buffer.from accepts both a Buffer and a string chunk, so there is no
      // branch here to leave untested.
      for await (const chunk of payload) chunks.push(Buffer.from(chunk as Buffer | string));
      const raw = Buffer.concat(chunks);
      (request as FastifyRequest & { rawBody?: string }).rawBody = raw.toString("utf8");
      return Readable.from([raw]);
    }
  }, async (request, reply) => {
    if (!razorpayWebhookConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Razorpay webhook is not configured.", request.id);
    }
    const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody;
    const signature = request.headers["x-razorpay-signature"];
    if (!verifyRazorpaySignature(rawBody, typeof signature === "string" ? signature : undefined)) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Invalid webhook signature.", request.id);
    }
    const parsed = parseBody(razorpayWebhookSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const { event, payload } = parsed.data;
    const payment = payload.payment?.entity;
    // Razorpay's own event id where it sends one; otherwise the event and the
    // entity it concerns, which is as unique as a re-delivery of the same event.
    const headerEventId = request.headers["x-razorpay-event-id"];
    const eventId = typeof headerEventId === "string" && headerEventId.length > 0
      ? headerEventId
      : `${event}:${payment?.id ?? payload.refund?.entity.id ?? "none"}`;
    if (!claimEvent(eventId)) {
      // A re-delivery. Acked, deliberately: Razorpay has nothing left to do and
      // retrying would not change the outcome.
      return ok({ received: true, duplicate: true }, request.id);
    }

    if (event === "payment.captured" && payment) {
      const accountId = payment.notes?.accountId;
      const product = payment.notes?.product;
      // A payment that did not come from our own checkout (a Payment Link, say)
      // carries no account: nothing to grant, and nothing is wrong either.
      if (!accountId || !product) {
        return ok({ received: true, granted: false }, request.id);
      }
      const { plan, expiresAt } = grantWindow(product, Date.now());
      const stored = await recordWebGrant(accountId, {
        product,
        plan,
        expiresAt,
        paymentId: payment.id,
        amountMinor: payment.amount,
        currency: payment.currency,
        grantedAt: new Date().toISOString()
      });
      if (!stored) {
        // Do NOT ack: a retry is the only thing that can still save this
        // purchase, and Razorpay will retry a non-2xx.
        reply.code(503);
        return fail("SERVICE_UNAVAILABLE", "Could not record the purchase. Please retry.", request.id);
      }
      return ok({ received: true, granted: true }, request.id);
    }

    if (event === "refund.processed" && payload.refund) {
      if (!(await revokeWebGrantByPayment(payload.refund.entity.payment_id))) {
        reply.code(503);
        return fail("SERVICE_UNAVAILABLE", "Could not record the refund. Please retry.", request.id);
      }
      return ok({ received: true, revoked: true }, request.id);
    }

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
      return upstreamFailure(request, reply, error, "Plaid request failed.");
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
      return upstreamFailure(request, reply, error, "Plaid request failed.");
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
      return upstreamFailure(request, reply, error, "Plaid request failed.");
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
      return upstreamFailure(request, reply, error, "Plaid request failed.");
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
      hasMore: result.hasMore
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
    return ok(result, request.id);
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(fail("NOT_FOUND", "Route not found.", request.id));
  });


  return app;
}

function clientErrorMessage(status: number): string {
  if (status === 413) return "Request body is too large.";
  if (status === 415) return "Unsupported content type.";
  return "Malformed request.";
}

// An upstream provider's error text (an AI provider's raw error body, a Plaid
// error code) can carry account details, so it stays in the server log; the
// client gets a fixed message (finding F31). The mobile app reads only the status.
function upstreamFailure(request: FastifyRequest, reply: FastifyReply, error: unknown, publicMessage: string) {
  request.log.warn({ err: error }, publicMessage);
  reply.code(502);
  return fail("UPSTREAM_ERROR", publicMessage, request.id);
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
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    error: fail("BAD_REQUEST", "Request validation failed.", requestId, {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    })
  };
}

// Query values are always strings (or absent).
function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

// A caller belongs to a household if they own it or are listed as a member.
// Used to authorize household reads/writes against the verified token's user id.
function isHouseholdMember(household: Household, userId: string): boolean {
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
  const { provider } = params as { provider: string };
  return provider === "plaid" || provider === "mx" ? provider : null;
}
