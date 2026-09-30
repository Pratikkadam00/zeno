import type { FastifyRequest } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * app.ts paths the main suite (app.test.ts) does not reach: CORS decisions
 * (F30), client errors keeping their 4xx status (F33), the 500 path and its
 * monitoring webhook, upstream failures that must not leak provider text (F31),
 * the Redis-backed limiter degrading open, and each route's validation /
 * not-found / not-configured branch. Plaid routes are covered only in their
 * NOT-configured state here (the production state); configured paths are P1.10.
 *
 * Upstream modules are replaced with controllable fakes at the module boundary
 * (no network): coach + billing (configured-ness and the upstream call), the
 * storage ping, and ioredis.
 */
const upstream = vi.hoisted(() => ({
  coachConfigured: false,
  coach: vi.fn(),
  billingConfigured: false,
  entitlement: vi.fn(),
  ping: vi.fn(async () => "skipped" as "skipped" | "ok" | "error")
}));
vi.mock("./coach", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./coach")>()),
  coachConfigured: () => upstream.coachConfigured,
  generateCoaching: (...a: unknown[]) => upstream.coach(...a)
}));
vi.mock("./billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./billing")>()),
  billingConfigured: () => upstream.billingConfigured,
  fetchEntitlement: (...a: unknown[]) => upstream.entitlement(...a)
}));
vi.mock("./storage/pg", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./storage/pg")>()),
  pingStorage: () => upstream.ping()
}));

// A Redis that is down: every rate-limit command fails, the way a refused
// connection does. Records how the client was constructed.
const redis = vi.hoisted(() => ({ instances: [] as { url: string; options: Record<string, unknown>; handlers: Record<string, (e: Error) => void> }[] }));
vi.mock("ioredis", () => ({
  default: class FakeRedis {
    handlers: Record<string, (e: Error) => void> = {};
    [command: string]: unknown;
    constructor(url: string, options: Record<string, unknown>) {
      redis.instances.push({ url, options, handlers: this.handlers });
    }
    on(event: string, handler: (e: Error) => void) {
      this.handlers[event] = handler;
      return this;
    }
    defineCommand(name: string) {
      this[name] = (...args: unknown[]) => (args.at(-1) as (e: Error) => void)(new Error("connect ECONNREFUSED"));
    }
    async quit() {}
  }
}));

const { accountRateLimitKey, buildApp } = await import("./app");

type App = Awaited<ReturnType<typeof buildApp>>;
const saved: Record<string, string | undefined> = {};
function setEnv(key: string, value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
    delete saved[k];
  }
  vi.restoreAllMocks();
});
beforeEach(() => {
  upstream.coachConfigured = false;
  upstream.billingConfigured = false;
  upstream.coach.mockReset();
  upstream.entitlement.mockReset();
  upstream.ping.mockReset().mockResolvedValue("skipped");
  redis.instances.length = 0;
});

async function tokenFor(app: App, email: string): Promise<string> {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const devLink = requested.json().data.devLink as string;
  const raw = decodeURIComponent(devLink.split("token=")[1] ?? "");
  const verified = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}` });
  return verified.json().data.accessToken as string;
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("CORS (F30: a disallowed origin is refused quietly, never a 500)", () => {
  it("an allow-listed origin is echoed back", async () => {
    setEnv("CORS_ALLOWED_ORIGINS", "https://zeno.app, https://www.zeno.app");
    const app = await buildApp();
    const r = await app.inject({ method: "GET", url: "/api/v1/health", headers: { origin: "https://www.zeno.app" } });
    expect(r.statusCode).toBe(200);
    expect(r.headers["access-control-allow-origin"]).toBe("https://www.zeno.app");
  });

  it("a disallowed origin: the request is served without CORS headers (the browser withholds it)", async () => {
    setEnv("CORS_ALLOWED_ORIGINS", "https://zeno.app");
    const app = await buildApp();
    const r = await app.inject({ method: "GET", url: "/api/v1/health", headers: { origin: "https://evil.example" } });
    expect(r.statusCode).toBe(200);
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
    const pre = await app.inject({ method: "OPTIONS", url: "/api/v1/health", headers: { origin: "https://evil.example", "access-control-request-method": "GET" } });
    expect(pre.statusCode).toBeLessThan(500);
    expect(pre.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("localhost origins are allowed in development, refused in production", async () => {
    const app = await buildApp();
    const dev = await app.inject({ method: "GET", url: "/api/v1/health", headers: { origin: "http://localhost:3011" } });
    expect(dev.headers["access-control-allow-origin"]).toBe("http://localhost:3011");
    const loopback = await app.inject({ method: "GET", url: "/api/v1/health", headers: { origin: "http://127.0.0.1" } });
    expect(loopback.headers["access-control-allow-origin"]).toBe("http://127.0.0.1");
    const lookalike = await app.inject({ method: "GET", url: "/api/v1/health", headers: { origin: "http://localhost.evil.example" } });
    expect(lookalike.headers["access-control-allow-origin"]).toBeUndefined();
    setEnv("NODE_ENV", "production"); // the check is per request
    const prod = await app.inject({ method: "GET", url: "/api/v1/health", headers: { origin: "http://localhost:3011" } });
    expect(prod.statusCode).toBe(200);
    expect(prod.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("a request without an Origin (the mobile app, server-to-server) is not a CORS request", async () => {
    const app = await buildApp();
    const r = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(r.statusCode).toBe(200);
  });
});

describe("client errors keep their status (F33: never a 500 or an alert)", () => {
  it("malformed JSON → 400, an oversized body → 413, an unknown content type → 415; nothing logged or reported", async () => {
    setEnv("MONITORING_WEBHOOK_URL", "https://alerts.example/hook");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const app = await buildApp();
    const errorLog = vi.fn();
    app.addHook("onRequest", async (request) => { vi.spyOn(request.log, "error").mockImplementation(errorLog); });
    const post = (headers: Record<string, string>, payload: string) => app.inject({ method: "POST", url: "/api/v1/events", headers, payload });
    const badJson = await post({ "content-type": "application/json" }, "{bad");
    const tooBig = await post({ "content-type": "application/json" }, JSON.stringify({ event: "x".repeat(1_100_000) }));
    const badType = await post({ "content-type": "application/x-weird" }, "x");
    expect([badJson.statusCode, tooBig.statusCode, badType.statusCode]).toEqual([400, 413, 415]);
    expect(badJson.json().error).toEqual({ code: "BAD_REQUEST", message: "Malformed request." });
    expect(tooBig.json().error.message).toBe("Request body is too large.");
    expect(badType.json().error.message).toBe("Unsupported content type.");
    expect(errorLog).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("F79: the auth routes use the API's error handler too", () => {
  it("malformed JSON on an auth route is our 400 envelope, never Fastify's default body with its internal code", async () => {
    const app = await buildApp();
    const r = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", headers: { "content-type": "application/json" }, payload: "{bad" });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toEqual({ data: null, error: { code: "BAD_REQUEST", message: "Malformed request." }, meta: { requestId: expect.any(String) } });
    expect(r.body).not.toContain("FST_");
  });

  it("an unexpected error inside an auth route is our 500 envelope (and reaches the monitoring webhook)", async () => {
    setEnv("MONITORING_WEBHOOK_URL", "https://alerts.example/hook");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const app = await buildApp();
    app.addHook("preHandler", async (request) => {
      if (request.url === "/api/v1/auth/logout") throw new Error("internal detail that must not leak");
    });
    const r = await app.inject({ method: "POST", url: "/api/v1/auth/logout", payload: {} });
    expect(r.statusCode).toBe(500);
    expect(r.json().error).toEqual({ code: "INTERNAL", message: "Unexpected server error." });
    expect(r.body).not.toContain("internal detail");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("unexpected server errors", () => {
  it("→ 500 INTERNAL, and the webhook gets the route PATTERN and message only (no body or query)", async () => {
    setEnv("MONITORING_WEBHOOK_URL", "https://alerts.example/hook");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("webhook down")); // swallowed
    const app = await buildApp();
    app.addHook("preHandler", async (request) => {
      if (request.url.includes("boom")) throw new Error("kaput");
    });
    const r = await app.inject({ method: "GET", url: "/api/v1/health?boom=secret-value" });
    expect(r.statusCode).toBe(500);
    expect(r.json().error).toEqual({ code: "INTERNAL", message: "Unexpected server error." });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://alerts.example/hook");
    expect(JSON.parse(String(init!.body))).toEqual({
      service: "zeno-api", level: "error", message: "kaput", method: "GET", route: "/api/v1/health", requestId: r.json().meta.requestId
    });
    expect(String(init!.body)).not.toContain("secret-value");
  });

  it("a thrown non-Error is reported as its string; an error before routing reports route 'unknown'", async () => {
    setEnv("MONITORING_WEBHOOK_URL", "https://alerts.example/hook");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const app = await buildApp();
    app.addHook("onRequest", async (request) => {
      if (request.url === "/no-such-route") throw Object.assign(new Error("early"), { name: "EarlyError" });
      if (request.url.includes("plain")) throw "plain failure";
    });
    await app.inject({ method: "GET", url: "/no-such-route" });
    await app.inject({ method: "GET", url: "/api/v1/health?plain=1" });
    const bodies = fetchSpy.mock.calls.map(([, init]) => JSON.parse(String(init!.body)));
    expect(bodies[0]).toMatchObject({ message: "early", route: "unknown" });
    expect(bodies[1]).toMatchObject({ message: "plain failure", route: "/api/v1/health" });
  });

  it("without MONITORING_WEBHOOK_URL nothing is sent", async () => {
    setEnv("MONITORING_WEBHOOK_URL", undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const app = await buildApp();
    app.addHook("preHandler", async () => { throw new Error("kaput"); });
    expect((await app.inject({ method: "GET", url: "/api/v1/health" })).statusCode).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("rate limiting", () => {
  it("with REDIS_URL: a fail-fast client, errors logged, and a Redis outage degrades OPEN (requests still served)", async () => {
    setEnv("REDIS_URL", "redis://cache.internal:6379");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = await buildApp();
    expect(redis.instances).toHaveLength(1);
    expect(redis.instances[0]).toMatchObject({ url: "redis://cache.internal:6379", options: { connectTimeout: 500, maxRetriesPerRequest: 1, enableOfflineQueue: false } });
    redis.instances[0]!.handlers.error!(new Error("ECONNRESET"));
    expect(consoleError).toHaveBeenCalledWith("[redis] rate-limit store error:", "ECONNRESET");
    const r = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(r.statusCode).toBe(200);
  });

  it("the coach limit is keyed by account; the IP is only a defensive fallback", () => {
    // A request with no, or no valid, access token is keyed by its IP.
    expect(accountRateLimitKey({ headers: {}, ip: "203.0.113.9" } as FastifyRequest)).toBe("203.0.113.9");
    expect(accountRateLimitKey({ headers: { authorization: "Bearer forged.token.value" }, ip: "203.0.113.9" } as unknown as FastifyRequest)).toBe("203.0.113.9");
    expect(accountRateLimitKey({ headers: { authorization: "Basic abc" }, ip: "203.0.113.9" } as unknown as FastifyRequest)).toBe("203.0.113.9");
  });
});

describe("readiness", () => {
  it("a configured-but-down database → 503 with the failing check named", async () => {
    upstream.ping.mockResolvedValue("error");
    const app = await buildApp();
    const r = await app.inject({ method: "GET", url: "/health/ready" });
    expect(r.statusCode).toBe(503);
    expect(r.json().error.code).toBe("SERVICE_UNAVAILABLE");
    expect(r.json().error.details).toEqual({ checks: { postgres: "error" } });
  });
});

describe("validation, not-found and not-configured branches", () => {
  it("events: an invalid body → 400", async () => {
    const app = await buildApp();
    const r = await app.inject({ method: "POST", url: "/api/v1/events", payload: { event: "" } });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.details.issues[0].path).toBe("event");
  });

  it("services: a query narrows the list, and an unknown slug → 404", async () => {
    const app = await buildApp();
    const all = (await app.inject({ method: "GET", url: "/api/v1/services" })).json().data;
    const netflix = (await app.inject({ method: "GET", url: "/api/v1/services?q=netflix&limit=abc" })).json().data;
    expect(netflix.total).toBeLessThan(all.total);
    expect(netflix.limit).toBe(25);
    const missing = await app.inject({ method: "GET", url: "/api/v1/services/no-such-service" });
    expect(missing.statusCode).toBe(404);
  });

  it("open banking: an unknown provider → 400", async () => {
    const app = await buildApp();
    const token = await tokenFor(app, "ob@zeno.test");
    const r = await app.inject({ method: "POST", url: "/api/v1/open-banking/wellsfargo/intent", headers: auth(token) });
    expect(r.statusCode).toBe(400);
  });

  it("family: invalid join → 400; spend and leave on an unknown household → 404", async () => {
    const app = await buildApp();
    const token = await tokenFor(app, "fam@zeno.test");
    const join = await app.inject({ method: "POST", url: "/api/v1/family/join", headers: auth(token), payload: { shareCode: "x" } });
    expect(join.statusCode).toBe(400);
    const spend = await app.inject({ method: "POST", url: "/api/v1/family/hh_nope/spend", headers: auth(token), payload: { monthlySpendMinor: 100 } });
    expect(spend.statusCode).toBe(404);
    const leave = await app.inject({ method: "POST", url: "/api/v1/family/hh_nope/leave", headers: auth(token) });
    expect(leave.statusCode).toBe(404);
  });

  it("sync pull: an invalid query → 400", async () => {
    const app = await buildApp();
    const token = await tokenFor(app, "sync@zeno.test");
    const r = await app.inject({ method: "GET", url: "/api/v1/sync/pull?limit=-5", headers: auth(token) });
    expect(r.statusCode).toBe(400);
  });

  it("billing webhook: unconfigured → 503; configured with a bad body → 400", async () => {
    setEnv("REVENUECAT_WEBHOOK_AUTH", undefined);
    const app = await buildApp();
    expect((await app.inject({ method: "POST", url: "/api/v1/billing/webhook", payload: {} })).statusCode).toBe(503);
    setEnv("REVENUECAT_WEBHOOK_AUTH", "hook-secret");
    const bad = await app.inject({ method: "POST", url: "/api/v1/billing/webhook", headers: { authorization: "Bearer hook-secret" }, payload: { event: {} } });
    expect(bad.statusCode).toBe(400);
  });

  it("F54: the webhook accepts RevenueCat's documented nulls and any timestamp (since F85 none is read), and caches nothing the payload claims", async () => {
    setEnv("REVENUECAT_WEBHOOK_AUTH", "hook-secret");
    const app = await buildApp();
    const hook = (event: Record<string, unknown>) => app.inject({
      method: "POST", url: "/api/v1/billing/webhook", headers: { authorization: "Bearer hook-secret" }, payload: { event }
    });
    // RevenueCat: expiration_at_ms "can be null for non-subscription purchases or
    // lifetime products"; entitlement_ids "can be null if the product_id is not
    // mapped to any entitlements". A 400 made RevenueCat retry and then drop it.
    expect((await hook({ app_user_id: "acct_lifetime", type: "NON_RENEWING_PURCHASE", entitlement_ids: ["pro"], expiration_at_ms: null })).statusCode).toBe(200);
    expect((await hook({ app_user_id: "acct_unmapped", type: "INITIAL_PURCHASE", entitlement_ids: null })).statusCode).toBe(200);
    // 8.64e15 ms is the largest instant a JS Date can hold (toISOString() throws
    // beyond it). The time is no longer read, so it cannot become a 500.
    expect((await hook({ app_user_id: "acct_huge", type: "RENEWAL", entitlement_ids: ["pro"], expiration_at_ms: 9_000_000_000_000_000 })).statusCode).toBe(200);
    const { getCachedEntitlement } = await import("./billing");
    for (const id of ["acct_lifetime", "acct_unmapped", "acct_huge"]) expect(getCachedEntitlement(id), id).toBeUndefined();
  });

  it("every Plaid route answers 503 when Plaid is not configured (the production state)", async () => {
    setEnv("PLAID_CLIENT_ID", undefined);
    setEnv("PLAID_SECRET", undefined);
    const app = await buildApp();
    const token = await tokenFor(app, "plaid-off@zeno.test");
    for (const url of ["/api/v1/plaid/link-token", "/api/v1/plaid/exchange", "/api/v1/plaid/transactions", "/api/v1/plaid/sandbox/public-token"]) {
      const r = await app.inject({ method: "POST", url, headers: auth(token), payload: {} });
      expect(r.statusCode, url).toBe(503);
      expect(r.json().error.code, url).toBe("SERVICE_UNAVAILABLE");
    }
  });
});

describe("informational routes (F32: no false 'server stores no financial data' claim)", () => {
  it("account, capabilities, business summary, widget contract and partners", async () => {
    const app = await buildApp();
    const token = await tokenFor(app, "info@zeno.test");
    const account = (await app.inject({ method: "GET", url: "/api/v1/account", headers: auth(token) })).json().data;
    expect(account).toEqual({ accountId: expect.any(String), plan: "free" });
    const capabilities = (await app.inject({ method: "GET", url: "/api/v1/capabilities" })).json().data;
    expect(capabilities.capabilities).toContain("family_vault");
    const business = (await app.inject({ method: "GET", url: "/api/v1/business/summary", headers: auth(token) })).json().data;
    expect(business.summary).toBeTruthy();
    for (const body of [account, capabilities, business]) {
      expect(body).not.toHaveProperty("serverStoresFinancialData");
    }
    const widget = (await app.inject({ method: "GET", url: "/api/v1/widgets/snapshot", headers: auth(token) })).json().data;
    expect(widget.snapshotContract).toMatchObject({ nextRenewal: null, activeCount: 0 });
    const partners = (await app.inject({ method: "GET", url: "/api/v1/partners" })).json().data;
    expect(Array.isArray(partners.integrations)).toBe(true);
    const providers = (await app.inject({ method: "GET", url: "/api/v1/open-banking/providers" })).json().data;
    expect(providers.providers.map((p: { id: string; mode: string }) => `${p.id}:${p.mode}`)).toEqual(["plaid:dev_adapter", "mx:dev_adapter"]);
  });
});

describe("upstream failures (F31: provider text stays in the server log)", () => {
  const coachBody = { totalMonthlyMinor: 1000, subscriptions: [{ name: "Netflix", category: "entertainment", monthlyMinor: 1000, billingCycle: "monthly" }] };

  it("coach: a configured provider's answer is returned; its failure is a fixed 502 message", async () => {
    upstream.coachConfigured = true;
    const app = await buildApp();
    const token = await tokenFor(app, "coach-up@zeno.test");
    upstream.coach.mockResolvedValueOnce({ source: "ai", model: "m", summary: "ok" });
    const good = await app.inject({ method: "POST", url: "/api/v1/coach", headers: auth(token), payload: coachBody });
    expect(good.json().data).toEqual({ source: "ai", model: "m", summary: "ok" });
    upstream.coach.mockRejectedValueOnce(new Error('AI provider request failed (HTTP 429): {"error":{"message":"Rate limit reached in organization org_SECRET123"}}'));
    const bad = await app.inject({ method: "POST", url: "/api/v1/coach", headers: auth(token), payload: coachBody });
    expect(bad.statusCode).toBe(502);
    expect(bad.json().error).toEqual({ code: "UPSTREAM_ERROR", message: "AI coach request failed." });
    expect(bad.body).not.toContain("org_SECRET123");
  });

  it("billing: a configured lookup is returned; its failure is a fixed 502 message", async () => {
    upstream.billingConfigured = true;
    const app = await buildApp();
    const token = await tokenFor(app, "billing-up@zeno.test");
    upstream.entitlement.mockResolvedValueOnce({ plan: "pro", active: true, expiresAt: null, source: "revenuecat" });
    const good = await app.inject({ method: "GET", url: "/api/v1/billing/entitlement", headers: auth(token) });
    expect(good.json().data.plan).toBe("pro");
    const token2 = await tokenFor(app, "billing-up2@zeno.test");
    upstream.entitlement.mockRejectedValueOnce(new Error("RevenueCat responded 500 for key sk_live_SECRET"));
    const bad = await app.inject({ method: "GET", url: "/api/v1/billing/entitlement", headers: auth(token2) });
    expect(bad.statusCode).toBe(502);
    expect(bad.json().error).toEqual({ code: "UPSTREAM_ERROR", message: "Entitlement lookup failed." });
    expect(bad.body).not.toContain("sk_live_SECRET");
  });
});
