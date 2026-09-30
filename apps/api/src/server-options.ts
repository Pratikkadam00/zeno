// Production logger options for the API process (used by start.ts).
//
// Deliberate config instead of a bare `logger: true` (standards §5/§6): an
// explicit level from env (info in production, debug elsewhere), NO pino-pretty
// transport (JSON is the intended production format), a redaction list for
// every field that could carry a secret, and a request serializer that never
// logs a query string.

/** Redacted (removed) from every log line. Fastify's default serializers log
 *  neither headers nor bodies, so these are defensive: they also cover a future
 *  custom serializer or an error object that embeds a request. pino ignores
 *  paths that are not present. */
export const LOG_REDACT_PATHS: readonly string[] = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-webhook-authorization"]',
  "req.body.refreshToken",
  "req.body.publicToken",
  "req.body.identityToken",
  "req.body.idToken",
  "req.body.token",
  "req.body.code"
];

// Structural subset of FastifyRequest that the serializer reads. `| undefined`
// on each field matches the real types under exactOptionalPropertyTypes (e.g.
// a socket's remotePort is `number | undefined`).
type LoggableRequest = {
  method?: string | undefined;
  url?: string | undefined;
  headers?: Record<string, unknown> | undefined;
  host?: string | undefined;
  ip?: string | undefined;
  socket?: { remotePort?: number | undefined } | null | undefined;
};

/** The path of a request URL, without its query string or fragment. */
export function pathOnly(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Mirrors Fastify 5's default `req` serializer (lib/logger-pino.js, asReqValue)
 * field for field, EXCEPT `url`, which is logged WITHOUT its query string.
 *
 * Why (finding F9, verified 2026-09-30 by a probe with this exact config):
 * magic-link verification is `GET /api/v1/auth/verify?token=<raw token>`, and
 * the default serializer wrote that token into the "incoming request" line of
 * every verification. A query string can carry any client-chosen or secret
 * value, so none is logged; the route pattern is recorded separately by the
 * metrics hook.
 */
export type SerializedRequest = {
  method?: string;
  url?: string;
  version?: string;
  host?: string;
  remoteAddress?: string;
  remotePort?: number;
};

export function serializeRequest(req: LoggableRequest): SerializedRequest {
  const version = req.headers?.["accept-version"];
  const fields = {
    method: req.method,
    url: pathOnly(req.url),
    version: typeof version === "string" ? version : undefined,
    host: req.host,
    remoteAddress: req.ip,
    remotePort: req.socket ? req.socket.remotePort : undefined
  };
  // Absent fields are omitted rather than set to undefined (the JSON output is
  // identical; this satisfies exactOptionalPropertyTypes against Fastify's type).
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as SerializedRequest;
}

export function buildLoggerOptions(env: NodeJS.ProcessEnv = process.env) {
  const inProduction = env.NODE_ENV === "production";
  return {
    level: env.LOG_LEVEL ?? (inProduction ? "info" : "debug"),
    redact: { paths: [...LOG_REDACT_PATHS], remove: true },
    serializers: { req: serializeRequest }
  };
}
