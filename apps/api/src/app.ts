import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { findServiceBySlug, searchServices, services } from "@subradar/service-catalog";
import { createBusinessSummary, createMockOpenBankingAdapter, createPublicApiKeyPreview, demoBusinessWorkspace, fail, listPartnerIntegrations, ok, syncPullSchema, syncPushSchema, type OpenBankingProvider, type PublicApiKey } from "@subradar/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import { authRoutes } from "./routes/auth";
import { createLinkToken, exchangePublicToken, getRecentTransactions, plaidConfigured, sandboxPublicToken } from "./plaid";
import { applyWebhookEvent, billingConfigured, fetchEntitlement, getCachedEntitlement, verifyWebhookAuth, webhookConfigured } from "./billing";
import { pullChanges, pushChanges, type EncryptedChange } from "./sync";
import { createHousehold, getHousehold, joinHousehold, setMemberSpend } from "./family";
import { coachConfigured, coachModel, generateCoaching } from "./coach";

export type BuildAppOptions = {
  logger?: boolean;
};

const DEFAULT_SERVICES_LIMIT = 25;
const MAX_SERVICES_LIMIT = 100;

const entitlementQuerySchema = z.object({ appUserId: z.string().min(1).max(256) });
const familyCreateSchema = z.object({
  ownerId: z.string().min(1).max(128),
  ownerName: z.string().min(1).max(80),
  monthlySpendMinor: z.number().int().min(0).optional()
});
const familyJoinSchema = z.object({
  shareCode: z.string().min(4).max(12),
  memberId: z.string().min(1).max(128),
  memberName: z.string().min(1).max(80),
  monthlySpendMinor: z.number().int().min(0).optional()
});
const familySpendSchema = z.object({
  memberId: z.string().min(1).max(128),
  monthlySpendMinor: z.number().int().min(0)
});
const coachRequestSchema = z.object({
  totalMonthlyMinor: z.number().int().min(0),
  currency: z.string().length(3).optional(),
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
  question: z.string().max(500).optional()
});
const plaidLinkTokenSchema = z.object({ userId: z.string().min(1).max(128).optional() });
const plaidExchangeSchema = z.object({ publicToken: z.string().min(1) });
const plaidTransactionsSchema = z.object({ accessToken: z.string().min(1) });

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    genReqId: () => randomUUID()
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
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
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
  await app.register(authRoutes, { prefix: "/api/v1" });

  app.get("/health", async (request) => ok({ status: "ok", service: "subradar-api" }, request.id));
  app.get("/api/v1/health", async (request) => ok({ status: "ok", service: "subradar-api" }, request.id));

  app.get("/api/v1/account", async (request) => ok({
    accountId: "acct_dev",
    emailHash: "dev-only",
    plan: "free",
    serverStoresFinancialData: false
  }, request.id));

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
      "encrypted_sync_envelope_only",
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

  app.post("/api/v1/open-banking/:provider/intent", async (request, reply) => {
    const provider = readProviderParam(request.params);
    if (!provider) {
      reply.code(400);
      return fail("BAD_REQUEST", "Provider must be plaid or mx.", request.id);
    }

    const adapter = createMockOpenBankingAdapter(provider);
    const intent = await adapter.createConnectionIntent({
      provider,
      accountId: "acct_dev",
      redirectUri: "subradar://bank-connected"
    });

    return ok({ intent }, request.id);
  });

  // ── Family / household sharing (share-code join + combined spend view). ──
  app.post("/api/v1/family/create", async (request, reply) => {
    const parsed = parseBody(familyCreateSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const household = createHousehold(parsed.data.ownerId, parsed.data.ownerName, parsed.data.monthlySpendMinor ?? 0);
    return ok({ household }, request.id);
  });

  app.post("/api/v1/family/join", async (request, reply) => {
    const parsed = parseBody(familyJoinSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const household = joinHousehold(parsed.data.shareCode, parsed.data.memberId, parsed.data.memberName, parsed.data.monthlySpendMinor ?? 0);
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
    return ok({ household }, request.id);
  });

  app.post("/api/v1/family/:householdId/spend", async (request, reply) => {
    const householdId = (request.params as { householdId?: string }).householdId ?? "";
    const parsed = parseBody(familySpendSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const household = setMemberSpend(householdId, parsed.data.memberId, parsed.data.monthlySpendMinor);
    if (!household) {
      reply.code(404);
      return fail("NOT_FOUND", "Household not found.", request.id);
    }
    return ok({ household }, request.id);
  });

  // ── AI spend coach. Live when ANTHROPIC_API_KEY is set; otherwise reports
  //    "unconfigured" so the client falls back to local rule-based insights. ──
  app.post("/api/v1/coach", async (request, reply) => {
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
  app.get("/api/v1/billing/entitlement", async (request, reply) => {
    const parsed = parseBody(entitlementQuerySchema, request.query, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const cached = getCachedEntitlement(parsed.data.appUserId);
    if (cached) {
      return ok(cached, request.id);
    }
    if (!billingConfigured()) {
      return ok({ plan: "free", active: false, expiresAt: null, source: "unconfigured" }, request.id);
    }
    try {
      return ok(await fetchEntitlement(parsed.data.appUserId), request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Entitlement lookup failed.", request.id);
    }
  });

  app.post("/api/v1/billing/webhook", async (request, reply) => {
    if (!webhookConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Billing webhook is not configured.", request.id);
    }
    if (!verifyWebhookAuth(request.headers.authorization)) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Invalid webhook authorization.", request.id);
    }
    applyWebhookEvent(request.body);
    return ok({ received: true }, request.id);
  });

  // ── Plaid (optional bank connect). Live when PLAID_CLIENT_ID/SECRET are set,
  //    otherwise these report not-configured so the client stays in mock mode. ──
  app.post("/api/v1/plaid/link-token", async (request, reply) => {
    if (!plaidConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Bank connect is not configured on this server.", request.id);
    }
    const parsed = parseBody(plaidLinkTokenSchema, request.body ?? {}, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    try {
      return ok(await createLinkToken(parsed.data.userId ?? "zeno-sandbox-user"), request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Plaid request failed.", request.id);
    }
  });

  app.post("/api/v1/plaid/exchange", async (request, reply) => {
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
      return ok(await exchangePublicToken(parsed.data.publicToken), request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Plaid request failed.", request.id);
    }
  });

  app.post("/api/v1/plaid/transactions", async (request, reply) => {
    if (!plaidConfigured()) {
      reply.code(503);
      return fail("SERVICE_UNAVAILABLE", "Bank connect is not configured on this server.", request.id);
    }
    const parsed = parseBody(plaidTransactionsSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    try {
      const transactions = await getRecentTransactions(parsed.data.accessToken);
      return ok({ transactions, count: transactions.length }, request.id);
    } catch (error) {
      reply.code(502);
      return fail("UPSTREAM_ERROR", error instanceof Error ? error.message : "Plaid request failed.", request.id);
    }
  });

  // Sandbox-only convenience: mint a public token without the native Link UI so
  // the connect→exchange→transactions flow is testable end-to-end in sandbox.
  app.post("/api/v1/plaid/sandbox/public-token", async (request, reply) => {
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

  app.get("/api/v1/sync/pull", async (request, reply) => {
    const userId = readSyncUser(request.headers);
    if (!userId) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Missing x-zeno-user-id header.", request.id);
    }
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

  app.post("/api/v1/sync/push", async (request, reply) => {
    const userId = readSyncUser(request.headers);
    if (!userId) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Missing x-zeno-user-id header.", request.id);
    }
    const parsed = parseBody(syncPushSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }
    const result = pushChanges(userId, parsed.data.encryptedChanges as EncryptedChange[]);
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
    reply.code(500).send(fail("INTERNAL", "Unexpected server error.", request.id));
  });

  return app;
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

// Identifies the sync owner. Bound to a client-provided id here (payloads are
// end-to-end encrypted, so the server only ever holds undecryptable ciphertext);
// in production derive this from the verified JWT subject instead.
function readSyncUser(headers: Record<string, string | string[] | undefined>): string | null {
  const raw = headers["x-zeno-user-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.trim() ? value.trim() : null;
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
