import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp, readTrustProxyHops } from "./app";

/**
 * Client-IP resolution behind the hosting proxy.
 *
 * Every IP-keyed rate limit (auth, magic-link, the global 100/min) keys on
 * request.ip, so this decides whether limits are PER CLIENT. Two ways it can go
 * wrong, both pinned here:
 *   - Trusting nothing in production: request.ip becomes the load balancer for
 *     every visitor, so all users share one bucket and one noisy client locks
 *     everyone out. This is what Fastify 5.12 did to our old numeric setting
 *     (a number now means "trust nobody"), silently, on 2026-09-29.
 *   - Trusting too much: a client prepends fake X-Forwarded-For entries and
 *     rotates its limiter key at will.
 *
 * The contract: trust exactly N hops (default 1 in production, 0 elsewhere),
 * so request.ip is the address the Nth proxy appended — never a value the
 * client wrote.
 */

const ORIGINAL = { ...process.env };
const LOAD_BALANCER = "10.20.30.40";

beforeEach(() => {
  process.env = { ...ORIGINAL };
  delete process.env.TRUST_PROXY_HOPS;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

// The auth guard makes every /api/v1/auth/* pattern public, so a probe route
// there reports the resolved address without needing a token.
async function resolvedIp(xff: string | undefined, remoteAddress = LOAD_BALANCER): Promise<string> {
  const app = await buildApp();
  app.get("/api/v1/auth/__test/ip", async (request) => ({ ip: request.ip }));
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/auth/__test/ip",
    remoteAddress,
    headers: xff === undefined ? {} : { "x-forwarded-for": xff }
  });
  await app.close();
  expect(response.statusCode).toBe(200);
  return (response.json() as { ip: string }).ip;
}

describe("client IP behind the proxy (rate-limit key)", () => {
  it("production default trusts ONE hop: the client address the load balancer appended", async () => {
    process.env.NODE_ENV = "production";
    expect(await resolvedIp("203.0.113.7")).toBe("203.0.113.7");
  });

  it("production: entries the CLIENT wrote to X-Forwarded-For are ignored (no key rotation)", async () => {
    process.env.NODE_ENV = "production";
    // The client sent "X-Forwarded-For: 6.6.6.6"; the load balancer appended the
    // real peer. Only the appended address may become the key.
    expect(await resolvedIp("6.6.6.6, 203.0.113.7")).toBe("203.0.113.7");
    expect(await resolvedIp("1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.7")).toBe("203.0.113.7");
  });

  it("production with no X-Forwarded-For falls back to the socket peer", async () => {
    process.env.NODE_ENV = "production";
    expect(await resolvedIp(undefined, "198.51.100.9")).toBe("198.51.100.9");
  });

  it("outside production nothing is trusted: X-Forwarded-For never changes the key", async () => {
    process.env.NODE_ENV = "test";
    expect(await resolvedIp("203.0.113.7", "127.0.0.1")).toBe("127.0.0.1");
  });

  it("TRUST_PROXY_HOPS=0 disables trust even in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.TRUST_PROXY_HOPS = "0";
    expect(await resolvedIp("203.0.113.7")).toBe(LOAD_BALANCER);
  });

  it("TRUST_PROXY_HOPS=2 trusts exactly two hops (e.g. CDN in front of the load balancer)", async () => {
    process.env.NODE_ENV = "production";
    process.env.TRUST_PROXY_HOPS = "2";
    // client-written, real client (appended by the CDN), CDN edge (appended by the LB)
    expect(await resolvedIp("6.6.6.6, 203.0.113.7, 198.51.100.4")).toBe("203.0.113.7");
  });

  it("an invalid TRUST_PROXY_HOPS falls back to the safe default instead of trusting everything", async () => {
    process.env.NODE_ENV = "production";
    // "999" would trust any client-written chain (equivalent to `true`); "2x"
    // and "1.5" would be read as numbers by a loose parser.
    for (const bad of ["abc", "-1", "", "  ", "2x", "1.5", "999", "6"]) {
      process.env.TRUST_PROXY_HOPS = bad;
      expect(await resolvedIp("6.6.6.6, 5.5.5.5, 203.0.113.7"), `TRUST_PROXY_HOPS=${JSON.stringify(bad)}`).toBe("203.0.113.7");
    }
  });

  it("readTrustProxyHops: exact parsing rules", () => {
    expect(readTrustProxyHops({ NODE_ENV: "production" })).toBe(1);
    expect(readTrustProxyHops({ NODE_ENV: "development" })).toBe(0);
    expect(readTrustProxyHops({})).toBe(0);
    expect(readTrustProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: " 3 " })).toBe(3);
    expect(readTrustProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: "5" })).toBe(5);
    expect(readTrustProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: "6" })).toBe(1);
    expect(readTrustProxyHops({ NODE_ENV: "development", TRUST_PROXY_HOPS: "2" })).toBe(2);
  });

  it("two clients behind the same load balancer get SEPARATE rate-limit buckets", async () => {
    process.env.NODE_ENV = "test";
    process.env.TRUST_PROXY_HOPS = "1";
    const app = await buildApp();
    const hit = (client: string) =>
      app.inject({ method: "GET", url: "/api/v1/health", remoteAddress: LOAD_BALANCER, headers: { "x-forwarded-for": client } });

    // Exhaust client A's global 100/min bucket.
    for (let i = 0; i < 100; i += 1) expect((await hit("203.0.113.1")).statusCode).toBe(200);
    expect((await hit("203.0.113.1")).statusCode).toBe(429);
    // Client B, same load balancer, is unaffected.
    expect((await hit("203.0.113.2")).statusCode).toBe(200);
    await app.close();
  });
});
