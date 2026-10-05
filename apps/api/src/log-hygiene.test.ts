import { createSign, generateKeyPairSync } from "node:crypto";
import { Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * P2.5: log hygiene under the PRODUCTION logger configuration (the exact
 * options start.ts passes to Fastify), and error-body hygiene.
 *
 * Every secret a client can send (a bearer token, a cookie, a magic-link token
 * and code in the query, a refresh token and a password in the body, the
 * webhook secret) carries a unique marker. Every JSON line pino writes, and
 * every console.* call made while handling the requests, is captured, and no
 * marker may appear in any of them. Error responses must carry the request id
 * (matching the x-request-id header) and nothing internal.
 */
const keys = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});
process.env.JWT_PRIVATE_KEY = keys.privateKey;
process.env.JWT_PUBLIC_KEY = keys.publicKey;
delete process.env.JWT_ISSUER;
delete process.env.JWT_AUDIENCE;
process.env.REVENUECAT_WEBHOOK_AUTH = "MARK-webhook-secret-7f3a";
process.env.DEMO_LOGIN_PASSWORD = "MARK-demo-password-91c2";

const { buildApp } = await import("./app");
const { buildLoggerOptions } = await import("./server-options");

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
function validToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT", kid: "logs" });
  const body = b64({ sub: "acct_logs", iss: "zeno-api", aud: "zeno-mobile", iat: now, exp: now + 600, tag: "MARK-inside-a-valid-token" });
  const s = createSign("RSA-SHA256");
  s.update(`${head}.${body}`);
  s.end();
  return `${head}.${body}.${s.sign(keys.privateKey, "base64url")}`;
}

/** The production logger options, at debug level (more lines = a stricter test), into memory. */
async function appWithCapturedLogs() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(...String(chunk).split("\n").filter(Boolean));
      done();
    }
  });
  const app = await buildApp({ logger: { ...buildLoggerOptions({ NODE_ENV: "production", LOG_LEVEL: "debug" }), stream } });
  return { app, lines };
}

afterEach(() => vi.restoreAllMocks());

describe("no secret a client sends ever reaches a log line", () => {
  it("bearer tokens, cookies, magic-link token and code, refresh token, password, webhook secret: all absent from pino and console output", async () => {
    const consoleCalls: unknown[][] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => { consoleCalls.push(args); });
    }
    const { app, lines } = await appWithCapturedLogs();
    const token = validToken();
    const secrets = {
      bearer: token,
      bearerTag: "MARK-inside-a-valid-token",
      forgedBearer: "MARK-forged-bearer-4d1e",
      cookie: "MARK-cookie-session-0b5f",
      magicToken: "MARK-magic-link-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      magicCode: "MARK12",
      refresh: "MARK-refresh-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      password: "MARK-demo-password-91c2",
      webhook: "MARK-webhook-secret-7f3a",
      email: "mark-person@example.com"
    };
    const ip = (n: number) => `192.0.2.${n}`;
    // A server error while a secret is in flight (registered before the first
    // request starts the app): the error line must not carry the secret.
    app.addHook("preHandler", async (request) => {
      if (request.url.startsWith("/api/v1/capabilities")) throw new Error("kaput");
    });
    await app.inject({ method: "GET", url: "/api/v1/account", remoteAddress: ip(1), headers: { authorization: `Bearer ${secrets.bearer}`, cookie: `session=${secrets.cookie}` } });
    await app.inject({ method: "GET", url: "/api/v1/account", remoteAddress: ip(2), headers: { authorization: `Bearer ${secrets.forgedBearer}` } });
    await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${secrets.magicToken}`, remoteAddress: ip(3) });
    await app.inject({ method: "GET", url: `/api/v1/auth/verify?email=${secrets.email}&code=${secrets.magicCode}`, remoteAddress: ip(4) });
    await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: ip(11), payload: { email: secrets.email } });
    await app.inject({ method: "POST", url: "/api/v1/auth/refresh", remoteAddress: ip(5), payload: { refreshToken: secrets.refresh } });
    await app.inject({ method: "POST", url: "/api/v1/auth/demo-login", remoteAddress: ip(6), payload: { email: "demo@zeno.local", password: secrets.password } });
    await app.inject({ method: "POST", url: "/api/v1/auth/demo-login", remoteAddress: ip(7), payload: { email: "demo@zeno.local", password: `${secrets.password}-wrong` } });
    await app.inject({ method: "POST", url: "/api/v1/billing/webhook", remoteAddress: ip(8), headers: { authorization: `Bearer ${secrets.webhook}` }, payload: { event: { app_user_id: "acct_logs", type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } } });
    await app.inject({ method: "POST", url: "/api/v1/billing/webhook", remoteAddress: ip(9), headers: { authorization: `Bearer ${secrets.webhook}-wrong` }, payload: {} });
    await app.inject({ method: "GET", url: `/api/v1/capabilities?apiKey=${secrets.cookie}`, remoteAddress: ip(10), headers: { authorization: `Bearer ${secrets.bearer}` } });
    await app.close();

    expect(lines.length).toBeGreaterThan(10); // the logger really wrote lines
    const everything = [...lines, ...consoleCalls.map((c) => JSON.stringify(c))].join("\n");
    for (const [name, value] of Object.entries(secrets)) {
      expect(everything.includes(value), `${name} leaked into the logs`).toBe(false);
    }
    // The generic marker too: nothing a client marked may be echoed anywhere.
    expect(everything).not.toContain("MARK");
  });

  it("the request line logs the path only (never a query string) and the server error line is at error level", async () => {
    const { app, lines } = await appWithCapturedLogs();
    app.addHook("preHandler", async (request) => {
      if (request.url.startsWith("/api/v1/partners")) throw new Error("kaput");
    });
    await app.inject({ method: "GET", url: "/api/v1/services?q=private-search-term", remoteAddress: "192.0.2.20" });
    await app.inject({ method: "GET", url: "/api/v1/partners", remoteAddress: "192.0.2.21" });
    await app.close();
    const parsed = lines.map((l) => JSON.parse(l) as { msg?: string; level?: number; req?: { url?: string }; reqId?: string });
    const incoming = parsed.filter((l) => l.msg === "incoming request");
    expect(incoming.map((l) => l.req?.url)).toEqual(["/api/v1/services", "/api/v1/partners"]);
    expect(lines.join("\n")).not.toContain("private-search-term");
    const errorLine = parsed.find((l) => l.level === 50);
    expect(errorLine, "the 500 is logged at error level").toBeDefined();
    expect(errorLine!.reqId).toEqual(expect.any(String));
  });
});

describe("error bodies", () => {
  it("every 4xx and 5xx carries the request id (matching x-request-id) and no internals", async () => {
    const { app } = await appWithCapturedLogs();
    app.addHook("preHandler", async (request) => {
      if (request.url.startsWith("/api/v1/partners")) throw Object.assign(new Error("secret internal detail at /srv/app.ts:12"), { stack: "Error: x\n    at /srv/node_modules/x.js:1:1" });
    });
    const cases = [
      await app.inject({ method: "GET", url: "/api/v1/account", remoteAddress: "192.0.2.30" }), // 401
      await app.inject({ method: "POST", url: "/api/v1/events", remoteAddress: "192.0.2.31", payload: { event: "" } }), // 400
      await app.inject({ method: "GET", url: "/api/v1/services/no-such-service", remoteAddress: "192.0.2.32" }), // 404
      await app.inject({ method: "GET", url: "/no-such-route", remoteAddress: "192.0.2.33" }), // 404 not found handler
      await app.inject({ method: "POST", url: "/api/v1/events", remoteAddress: "192.0.2.34", headers: { "content-type": "application/json" }, payload: "{bad" }), // 400 parser
      await app.inject({ method: "GET", url: "/api/v1/partners", remoteAddress: "192.0.2.35" }) // 500
    ];
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(cases.map((r) => r.statusCode)).toEqual([401, 400, 404, 404, 400, 500]);
    for (const r of cases) {
      const body = r.json() as { meta: { requestId: string }; error: { code: string; message: string } };
      expect(body.meta.requestId).toBe(r.headers["x-request-id"]);
      expect(r.body).not.toMatch(/secret internal detail|node_modules|\n\s+at |\/srv\//);
      expect(Object.keys(body.error).sort()).toEqual(expect.arrayContaining(["code", "message"]));
    }
    await app.close();
  });
});
