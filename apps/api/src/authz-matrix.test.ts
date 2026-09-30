import { createHmac, createSign, generateKeyPairSync, type KeyObject } from "node:crypto";
import type { InjectOptions } from "fastify";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * P2.2: the authorization matrix, table-driven from the LIVE route list.
 *
 *  1. Inventory: every route Fastify registers must have a row in ACCESS, and
 *     every row must still exist. A new route cannot ship without deciding who
 *     may call it, and this suite then covers it automatically.
 *  2. Every "token" route rejects every broken or hostile token with the SAME
 *     401 body (nothing tells an attacker which check failed): none, empty,
 *     wrong scheme, garbage, expired, wrong issuer, wrong audience, alg "none",
 *     HS256 signed with the public key, a foreign RSA key, and a deleted
 *     account's token (F76).
 *  3. "public" routes answer without a token; "own-auth" routes reject a
 *     missing or wrong credential of their own.
 *  4. Another household's resources: 403 for a stranger, identical bodies.
 *
 * Signed with a FIXED key pair so tokens can be minted here exactly as the
 * API mints them.
 */
const keys = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});
const foreign = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.JWT_PRIVATE_KEY = keys.privateKey;
process.env.JWT_PUBLIC_KEY = keys.publicKey;
delete process.env.JWT_ISSUER;
delete process.env.JWT_AUDIENCE;
process.env.REVENUECAT_WEBHOOK_AUTH = "matrix-webhook-secret";

const { buildApp } = await import("./app");
const { concreteUrl, routesFromTree } = await import("./route-inventory.testutil");
type App = Awaited<ReturnType<typeof buildApp>>;

type Access = "public" | "own-auth" | "token";
/** Every route, and who may call it. Keyed "METHOD /pattern" (HEAD is Fastify's automatic twin of GET). */
const ACCESS: Record<string, Access> = {
  "GET /health": "public",
  "GET /health/ready": "public",
  "GET /api/v1/health": "public",
  "GET /api/v1/health/ready": "public",
  "GET /metrics": "own-auth", // METRICS_TOKEN (required in production)
  "POST /api/v1/events": "public", // anonymous aggregate counters by design
  "GET /api/v1/services": "public",
  "GET /api/v1/services/:slug": "public",
  "GET /api/v1/capabilities": "public",
  "GET /api/v1/partners": "public",
  "GET /api/v1/open-banking/providers": "public",
  "POST /api/v1/billing/webhook": "own-auth", // REVENUECAT_WEBHOOK_AUTH
  "POST /api/v1/auth/magic-link": "public",
  "POST /api/v1/auth/magic-link/request": "public",
  "POST /api/v1/auth/magic-link/verify": "public",
  "GET /api/v1/auth/verify": "public",
  "POST /api/v1/auth/apple": "public",
  "POST /api/v1/auth/google": "public",
  "POST /api/v1/auth/refresh": "public",
  "POST /api/v1/auth/demo-login": "public",
  "POST /api/v1/auth/logout": "public",
  "GET /api/v1/account": "token",
  "DELETE /api/v1/account": "token",
  "GET /api/v1/sync/pull": "token",
  "POST /api/v1/sync/push": "token",
  "POST /api/v1/coach": "token",
  "GET /api/v1/widgets/snapshot": "token",
  "GET /api/v1/business/summary": "token",
  "GET /api/v1/billing/entitlement": "token",
  "GET /api/v1/public-api/keys": "token",
  "POST /api/v1/plaid/link-token": "token",
  "POST /api/v1/plaid/exchange": "token",
  "POST /api/v1/plaid/transactions": "token",
  "POST /api/v1/plaid/sandbox/public-token": "token",
  "POST /api/v1/open-banking/:provider/intent": "token",
  "POST /api/v1/family/create": "token",
  "POST /api/v1/family/join": "token",
  "GET /api/v1/family/:householdId": "token",
  "POST /api/v1/family/:householdId/spend": "token",
  "POST /api/v1/family/:householdId/leave": "token"
};
const concrete = concreteUrl;

let app: App;
let registered: string[] = [];

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  registered = routesFromTree(app.printRoutes({ commonPrefix: false }));
});

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
function rs256(payload: Record<string, unknown>, key: string | KeyObject = keys.privateKey): string {
  const head = b64({ alg: "RS256", typ: "JWT", kid: "matrix" });
  const body = b64(payload);
  const s = createSign("RSA-SHA256");
  s.update(`${head}.${body}`);
  s.end();
  return `${head}.${body}.${s.sign(key, "base64url")}`;
}
const now = () => Math.floor(Date.now() / 1000);
const claims = (over: Record<string, unknown> = {}) => ({ sub: "acct_matrix", iss: "zeno-api", aud: "zeno-mobile", iat: now(), exp: now() + 600, ...over });

// Signs in on a FRESH app instance: the sign-in route's own limit (5/min, per
// instance) would otherwise throttle this suite. The stores are module-level,
// so every instance shares the same accounts, households and sync data.
async function signIn(email: string) {
  const issuer = await buildApp();
  const requested = await issuer.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const raw = decodeURIComponent((requested.json().data.devLink as string).split("token=")[1]!);
  const data = (await issuer.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}` })).json().data;
  await issuer.close();
  return { token: data.accessToken as string, accountId: data.accountId as string };
}

/** The one 401 body every rejection must produce, request id aside. */
const UNAUTHORIZED = { data: null, error: { code: "UNAUTHORIZED", message: "Missing or invalid access token." } };
const withoutRequestId = (body: Record<string, unknown>) => ({ ...body, meta: undefined });

type Method = "GET" | "POST" | "DELETE";
// Every test gets its own client IP. Rate limits count unauthenticated
// requests too (F78), and this suite is about authorization, so no test may
// spend another test's per-route budget.
let nextIp = 1;
let clientIp = "198.51.100.1";
beforeEach(() => {
  nextIp += 1;
  clientIp = `198.51.${Math.floor(nextIp / 250)}.${nextIp % 250}`;
});

/** One matrix request: a body only where the method takes one. */
function call(method: Method, url: string, headers: Record<string, string> = {}) {
  const options: InjectOptions = method === "GET"
    ? { method, url, headers, remoteAddress: clientIp }
    : { method, url, headers, payload: {}, remoteAddress: clientIp };
  return app.inject(options);
}

describe("route inventory", () => {
  it("every registered route has an ACCESS row, and every row is a registered route", () => {
    expect([...new Set(registered)].sort()).toEqual(Object.keys(ACCESS).sort());
  });

  it("the deny-by-default split matches the auth guard (every non-public route really needs a token)", async () => {
    for (const [route, access] of Object.entries(ACCESS)) {
      if (access !== "token") continue;
      const [method, pattern] = route.split(" ") as [Method, string];
      const r = await call(method, concrete(pattern));
      expect(r.statusCode, route).toBe(401);
    }
  });
});

describe("every token route rejects every broken or hostile token, with ONE identical 401 body", () => {
  const attacks: [string, () => Promise<Record<string, string>>][] = [
    ["no Authorization header", async () => ({})],
    ["an empty bearer", async () => ({ authorization: "Bearer " })],
    ["the wrong scheme", async () => ({ authorization: "Basic dXNlcjpwYXNz" })],
    ["garbage", async () => ({ authorization: "Bearer not.a.jwt" })],
    ["an expired token", async () => ({ authorization: `Bearer ${rs256(claims({ exp: now() - 5 }))}` })],
    ["the wrong issuer", async () => ({ authorization: `Bearer ${rs256(claims({ iss: "evil-issuer" }))}` })],
    ["the wrong audience", async () => ({ authorization: `Bearer ${rs256(claims({ aud: "zeno-web" }))}` })],
    ["alg: none", async () => ({ authorization: `Bearer ${b64({ alg: "none", typ: "JWT" })}.${b64(claims())}.` })],
    ["HS256 signed with the server's PUBLIC key", async () => {
      const head = b64({ alg: "HS256", typ: "JWT" });
      const body = b64(claims());
      return { authorization: `Bearer ${head}.${body}.${createHmac("sha256", keys.publicKey).update(`${head}.${body}`).digest("base64url")}` };
    }],
    ["a token signed by a foreign RSA key", async () => ({ authorization: `Bearer ${rs256(claims(), foreign.privateKey)}` })],
    ["a DELETED account's token (F76)", async () => {
      const gone = await signIn(`matrix-gone-${Math.random().toString(36).slice(2)}@zeno.test`);
      const deleted = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: { authorization: `Bearer ${gone.token}` } });
      expect(deleted.json().data).toEqual({ deleted: true });
      return { authorization: `Bearer ${gone.token}` };
    }]
  ];

  it.each(attacks)("%s → 401 on every token route", async (_name, headersFor) => {
    const headers = await headersFor();
    for (const [route, access] of Object.entries(ACCESS)) {
      if (access !== "token") continue;
      const [method, pattern] = route.split(" ") as [Method, string];
      const r = await call(method, concrete(pattern), headers);
      expect(r.statusCode, `${route}`).toBe(401);
      expect(withoutRequestId(r.json()), route).toEqual({ ...UNAUTHORIZED, meta: undefined });
    }
  });

  it("a genuinely valid token is NOT rejected by the guard (the attacks above are the only difference)", async () => {
    const me = await signIn("matrix-valid@zeno.test");
    for (const [route, access] of Object.entries(ACCESS)) {
      if (access !== "token" || route === "DELETE /api/v1/account") continue;
      const [method, pattern] = route.split(" ") as [Method, string];
      const r = await call(method, concrete(pattern), { authorization: `Bearer ${me.token}` });
      expect(r.statusCode, route).not.toBe(401);
    }
  });
});

describe("logout (KNOWN GAP F77, owner decision)", () => {
  it("logout kills the refresh token at once; the ACCESS token keeps working until it expires (at most 15 minutes)", async () => {
    // Pinned on purpose, so closing the gap (a session id claim plus a
    // denylist, or a shorter access-token life) has to update this test
    // consciously. See F77 in docs/HARDENING_LOG.md.
    const issuer = await buildApp();
    const requested = await issuer.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "matrix-logout@zeno.test" } });
    const raw = decodeURIComponent((requested.json().data.devLink as string).split("token=")[1]!);
    const session = (await issuer.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}` })).json().data;
    await issuer.inject({ method: "POST", url: "/api/v1/auth/logout", payload: { refreshToken: session.refreshToken } });
    const refresh = await issuer.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken: session.refreshToken } });
    expect(refresh.statusCode).toBe(401);
    const stillWorks = await issuer.inject({ method: "GET", url: "/api/v1/account", headers: { authorization: `Bearer ${session.accessToken}` } });
    expect(stillWorks.statusCode).toBe(200);
    await issuer.close();
  });
});

describe("public and self-authenticated routes", () => {
  it("public routes answer without a token (never 401)", async () => {
    for (const [route, access] of Object.entries(ACCESS)) {
      if (access !== "public") continue;
      const [method, pattern] = route.split(" ") as [Method, string];
      const r = await call(method, concrete(pattern));
      expect(r.statusCode, route).not.toBe(401);
    }
  });

  it("the billing webhook rejects a missing or wrong secret, and a USER token is not its credential", async () => {
    const me = await signIn("matrix-webhook@zeno.test");
    const body = { event: { app_user_id: me.accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } };
    for (const headers of [{}, { authorization: "Bearer wrong-secret" }, { authorization: `Bearer ${me.token}` }]) {
      const r = await app.inject({ method: "POST", url: "/api/v1/billing/webhook", headers, payload: body });
      expect(r.statusCode).toBe(401);
    }
    const ok = await app.inject({ method: "POST", url: "/api/v1/billing/webhook", headers: { authorization: "Bearer matrix-webhook-secret" }, payload: body });
    expect(ok.statusCode).toBe(200);
  });

  it("metrics: open without a token outside production, 401 in production without METRICS_TOKEN", async () => {
    const saved = { env: process.env.NODE_ENV, token: process.env.METRICS_TOKEN };
    delete process.env.METRICS_TOKEN;
    try {
      expect((await app.inject({ method: "GET", url: "/metrics" })).statusCode).toBe(200);
      process.env.NODE_ENV = "production";
      expect((await app.inject({ method: "GET", url: "/metrics" })).statusCode).toBe(401);
    } finally {
      if (saved.env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = saved.env;
      if (saved.token !== undefined) process.env.METRICS_TOKEN = saved.token;
    }
  });
});

describe("another household's resources", () => {
  it("a stranger gets 403 on read, spend and leave, with identical bodies; an unknown id is 404", async () => {
    const owner = await signIn("matrix-owner@zeno.test");
    const stranger = await signIn("matrix-stranger@zeno.test");
    const household = (await app.inject({ method: "POST", url: "/api/v1/family/create", headers: { authorization: `Bearer ${owner.token}` }, payload: { ownerName: "Owner" } })).json().data.household;
    const as = { authorization: `Bearer ${stranger.token}` };
    const attempts = await Promise.all([
      app.inject({ method: "GET", url: `/api/v1/family/${household.id}`, headers: as }),
      app.inject({ method: "POST", url: `/api/v1/family/${household.id}/spend`, headers: as, payload: { monthlySpendMinor: 1 } }),
      app.inject({ method: "POST", url: `/api/v1/family/${household.id}/leave`, headers: as })
    ]);
    for (const r of attempts) {
      expect(r.statusCode).toBe(403);
      expect(withoutRequestId(r.json())).toEqual({ data: null, error: { code: "FORBIDDEN", message: "You are not a member of this household." }, meta: undefined });
    }
    const unknown = await app.inject({ method: "GET", url: "/api/v1/family/hh_does_not_exist", headers: as });
    expect(unknown.statusCode).toBe(404);
    // The household itself is untouched by the stranger's attempts.
    const mine = (await app.inject({ method: "GET", url: `/api/v1/family/${household.id}`, headers: { authorization: `Bearer ${owner.token}` } })).json().data.household;
    expect(mine.members.map((m: { id: string }) => m.id)).toEqual([owner.accountId]);
  });

  it("sync is scoped to the token's account: another user's changes are never served", async () => {
    const a = await signIn("matrix-sync-a@zeno.test");
    const b = await signIn("matrix-sync-b@zeno.test");
    await app.inject({ method: "POST", url: "/api/v1/sync/push", headers: { authorization: `Bearer ${a.token}` }, payload: { encryptedChanges: [{ entityType: "subscription", entityId: "secret", operation: "create", encryptedPayload: "a-only", vectorClock: { d: 1 } }] } });
    const pulled = await app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: { authorization: `Bearer ${b.token}` } });
    expect(pulled.json().data.encryptedChanges).toEqual([]);
  });
});
