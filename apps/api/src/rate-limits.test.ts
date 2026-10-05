import { generateKeyPairSync } from "node:crypto";
import type { InjectOptions } from "fastify";
import { describe, expect, it } from "vitest";

/**
 * P2.3: every route's rate limit, table-driven from the LIVE route list (a
 * route without a row fails the inventory). For each route: the declared
 * maximum is served, the next request is a 429 with the standard fail envelope
 * and a Retry-After header, and the bucket is per key (another IP, or for the
 * coach another ACCOUNT, is unaffected).
 *
 * These limits are PER API INSTANCE (in memory) unless REDIS_URL is set; an
 * edge limiter in front of the API is still required at scale (P8, owner).
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
delete process.env.REDIS_URL;

const { buildApp } = await import("./app");
const { concreteUrl, routesFromTree } = await import("./route-inventory.testutil");

type Limit = { max: number; key: "ip" | "account" };
const GLOBAL: Limit = { max: 100, key: "ip" };
/** Requests per minute, per key. Sign-in and account deletion are the strictest. */
const LIMITS: Record<string, Limit> = {
  "GET /health": GLOBAL,
  "GET /health/ready": GLOBAL,
  "GET /api/v1/health": GLOBAL,
  "GET /api/v1/health/ready": GLOBAL,
  "GET /metrics": GLOBAL,
  "POST /api/v1/events": { max: 60, key: "ip" },
  "GET /api/v1/services": GLOBAL,
  "GET /api/v1/services/:slug": GLOBAL,
  "GET /api/v1/capabilities": GLOBAL,
  "GET /api/v1/partners": GLOBAL,
  "GET /api/v1/open-banking/providers": GLOBAL,
  "POST /api/v1/billing/webhook": { max: 30, key: "ip" },
  "POST /api/v1/auth/magic-link": { max: 5, key: "ip" },
  "POST /api/v1/auth/magic-link/request": { max: 5, key: "ip" },
  "POST /api/v1/auth/demo-login": { max: 5, key: "ip" },
  "POST /api/v1/auth/logout": { max: 5, key: "ip" },
  "POST /api/v1/auth/verify": { max: 10, key: "ip" },
  "POST /api/v1/auth/magic-link/verify": { max: 10, key: "ip" },
  "POST /api/v1/auth/apple": { max: 10, key: "ip" },
  "POST /api/v1/auth/google": { max: 10, key: "ip" },
  "POST /api/v1/auth/refresh": { max: 10, key: "ip" },
  "GET /api/v1/account": GLOBAL,
  "DELETE /api/v1/account": { max: 5, key: "ip" },
  "GET /api/v1/sync/pull": { max: 60, key: "ip" },
  "POST /api/v1/sync/push": { max: 60, key: "ip" },
  "POST /api/v1/coach": { max: 10, key: "account" },
  "GET /api/v1/widgets/snapshot": GLOBAL,
  "GET /api/v1/business/summary": GLOBAL,
  "GET /api/v1/billing/entitlement": { max: 30, key: "ip" },
  "GET /api/v1/public-api/keys": GLOBAL,
  "POST /api/v1/plaid/link-token": { max: 10, key: "ip" },
  "POST /api/v1/plaid/exchange": { max: 10, key: "ip" },
  "POST /api/v1/plaid/transactions": { max: 20, key: "ip" },
  "POST /api/v1/plaid/sandbox/public-token": { max: 10, key: "ip" },
  "POST /api/v1/open-banking/:provider/intent": { max: 20, key: "ip" },
  "POST /api/v1/family/create": { max: 10, key: "ip" },
  "POST /api/v1/family/join": { max: 10, key: "ip" },
  "GET /api/v1/family/:householdId": GLOBAL,
  "POST /api/v1/family/:householdId/spend": { max: 30, key: "ip" },
  "POST /api/v1/family/:householdId/leave": { max: 20, key: "ip" }
};

type Method = "GET" | "POST" | "DELETE";
function options(method: Method, url: string, remoteAddress: string, headers: Record<string, string> = {}): InjectOptions {
  return method === "GET" ? { method, url, remoteAddress, headers } : { method, url, remoteAddress, headers, payload: {} };
}

async function tokenFor(email: string): Promise<string> {
  const issuer = await buildApp();
  const requested = await issuer.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const raw = decodeURIComponent((requested.json().data.devLink as string).split("token=")[1]!);
  const token = (await issuer.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: raw } })).json().data.accessToken as string;
  await issuer.close();
  return token;
}

describe("rate-limit inventory", () => {
  it("every registered route has a LIMITS row, and every row is registered", async () => {
    const app = await buildApp();
    await app.ready();
    expect(routesFromTree(app.printRoutes({ commonPrefix: false })).sort()).toEqual(Object.keys(LIMITS).sort());
    await app.close();
  });

  it("sign-in and account deletion are the strictest limits in the API", () => {
    const strictest = Math.min(...Object.values(LIMITS).map((l) => l.max));
    const atStrictest = Object.entries(LIMITS).filter(([, l]) => l.max === strictest).map(([route]) => route).sort();
    expect(atStrictest).toEqual([
      "DELETE /api/v1/account",
      "POST /api/v1/auth/demo-login",
      "POST /api/v1/auth/logout",
      "POST /api/v1/auth/magic-link",
      "POST /api/v1/auth/magic-link/request"
    ]);
  });
});

describe("every IP-keyed route: the maximum is served, the next is a 429, another IP is unaffected", () => {
  const ipRoutes = Object.entries(LIMITS).filter(([, l]) => l.key === "ip");
  it.each(ipRoutes)("%s", async (route, limit) => {
    const [method, pattern] = route.split(" ") as [Method, string];
    const url = concreteUrl(pattern);
    const app = await buildApp(); // a fresh limiter per route
    for (let i = 0; i < limit.max; i += 1) {
      const r = await app.inject(options(method, url, "203.0.113.10"));
      expect(r.statusCode, `${route} request ${i + 1}`).not.toBe(429);
    }
    const limited = await app.inject(options(method, url, "203.0.113.10"));
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe("RATE_LIMITED");
    expect(limited.json().data).toBeNull();
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    expect(limited.headers["x-ratelimit-limit"]).toBe(String(limit.max));
    const otherIp = await app.inject(options(method, url, "203.0.113.99"));
    expect(otherIp.statusCode).not.toBe(429);
    await app.close();
  });
});

describe("the AI coach is keyed by ACCOUNT", () => {
  it("rotating IPs does not evade it, and another account is unaffected", async () => {
    const alice = await tokenFor("rl-coach-a@zeno.test");
    const bob = await tokenFor("rl-coach-b@zeno.test");
    const app = await buildApp();
    for (let i = 0; i < 10; i += 1) {
      const r = await app.inject(options("POST", "/api/v1/coach", `203.0.113.${i + 1}`, { authorization: `Bearer ${alice}` }));
      expect(r.statusCode).not.toBe(429);
    }
    const limited = await app.inject(options("POST", "/api/v1/coach", "198.51.100.7", { authorization: `Bearer ${alice}` }));
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    const other = await app.inject(options("POST", "/api/v1/coach", "203.0.113.1", { authorization: `Bearer ${bob}` }));
    expect(other.statusCode).not.toBe(429);
    await app.close();
  });

  it("an UNAUTHENTICATED flood of the coach is limited per IP (F78: before, it was never limited at all)", async () => {
    const app = await buildApp();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      statuses.push((await app.inject(options("POST", "/api/v1/coach", "203.0.113.50"))).statusCode);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
    const limited = await app.inject(options("POST", "/api/v1/coach", "203.0.113.50"));
    expect(limited.json().error.code).toBe("RATE_LIMITED");
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
    // Another IP is unaffected.
    expect((await app.inject(options("POST", "/api/v1/coach", "203.0.113.51"))).statusCode).toBe(401);
    await app.close();
  });
});
