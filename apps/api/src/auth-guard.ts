import { fail } from "@zeno/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { verifyAccessToken } from "./routes/auth";

declare module "fastify" {
  interface FastifyRequest {
    // Set by the auth guard once a valid access token is verified. Present on
    // every PROTECTED route handler; never trust a client-supplied id instead.
    userId?: string;
  }
}

// Fail-closed: every route is PROTECTED unless its registered pattern is listed
// here. Adding a new route therefore requires a token by default — you have to
// opt out explicitly, not opt in. Matched against the route pattern
// (request.routeOptions.url), never the raw URL, so path params can't be smuggled.
const PUBLIC_ROUTES = new Set<string>([
  "/health",
  "/health/ready",
  "/api/v1/health",
  "/api/v1/health/ready",
  // Prometheus scrape endpoint. Gates itself with an optional METRICS_TOKEN
  // (bearer) rather than the user JWT; exposes only aggregate counters, no PII.
  "/metrics",
  "/api/v1/services",
  "/api/v1/services/:slug",
  "/api/v1/capabilities",
  "/api/v1/partners",
  "/api/v1/open-banking/providers",
  // Webhook authenticates with its own shared secret (verifyWebhookAuth), not the user JWT.
  "/api/v1/billing/webhook",
  // Aggregate, anonymous funnel events — local-only (no-account) users must be
  // able to post these too, and the handler deliberately never reads userId
  // even when a caller is authenticated (see app.ts).
  "/api/v1/events"
]);

function isPublic(routeUrl: string | undefined): boolean {
  // No matched route → let the 404 handler respond (don't mask it as a 401).
  if (!routeUrl) return true;
  if (PUBLIC_ROUTES.has(routeUrl)) return true;
  // All auth endpoints (magic-link, verify, apple, google, refresh, demo, logout).
  return routeUrl.startsWith("/api/v1/auth/");
}

function readBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
}

// Registers ONE onRequest hook that gates every protected route. Add it before
// route registration so it covers all routes (including the auth plugin, which
// is allowlisted above).
export function registerAuthGuard(app: FastifyInstance): void {
  app.addHook("onRequest", async (request: FastifyRequest, reply) => {
    if (isPublic(request.routeOptions?.url)) {
      return;
    }
    const token = readBearer(request.headers.authorization);
    const verified = token ? verifyAccessToken(token) : null;
    if (!verified) {
      reply.code(401).send(fail("UNAUTHORIZED", "Missing or invalid access token.", request.id));
      return reply;
    }
    request.userId = verified.sub;
  });
}
