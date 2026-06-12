import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { findServiceBySlug, searchServices, services } from "@subradar/service-catalog";
import { createBusinessSummary, createMockOpenBankingAdapter, createPublicApiKeyPreview, demoBusinessWorkspace, fail, listPartnerIntegrations, ok, syncPullSchema, syncPushSchema, type OpenBankingProvider, type PublicApiKey } from "@subradar/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z, ZodError } from "zod";
import { authRoutes } from "./routes/auth";

export type BuildAppOptions = {
  logger?: boolean;
};

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
    timeWindow: "1 minute"
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
    const query = (typeof request.query === "object" && request.query && "q" in request.query
      ? String((request.query as { q?: unknown }).q ?? "")
      : "").slice(0, 100);
    return ok({ services: query ? searchServices(query, 25) : services }, request.id);
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

  app.get("/api/v1/sync/pull", async (request, reply) => {
    const parsed = parseBody(syncPullSchema, request.query, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    return ok({
      encryptedChanges: [],
      cursor: parsed.data.cursor ?? null,
      serverStoresFinancialData: false
    }, request.id);
  });

  app.post("/api/v1/sync/push", async (request, reply) => {
    const parsed = parseBody(syncPushSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    return ok({
      accepted: parsed.data.encryptedChanges.length,
      rejected: 0,
      serverStoresFinancialData: false
    }, request.id);
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.code(500).send(fail("INTERNAL", "Unexpected server error.", request.id));
  });

  return app;
}

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
