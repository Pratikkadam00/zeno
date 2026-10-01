import { createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * F88 (plan P2.2): an unknown token and a revoked one must be indistinguishable
 * to the caller: "identical bodies, no timing leak on the token path (same code
 * path for unknown vs revoked)".
 *
 * verifyAccessToken rejects every token by returning null, and the guard turns
 * null into one 401. Measured before writing this (3 000 interleaved samples
 * each, after warm-up): live 29.1 µs, revoked 28.9, expired 28.5, a foreign
 * signing key 28.1 (the RSA verify dominates; revoked vs unknown-signer differ
 * by 0.8 µs, about 3 %, inside the p10–p90 spread); a string that is not a JWT
 * at all, 7.9 µs, which tells the sender nothing they did not already know.
 */
const keys = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const foreign = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const ENV_KEYS = ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "JWT_ISSUER", "JWT_AUDIENCE", "DATABASE_URL"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env.JWT_PRIVATE_KEY = keys.privateKey;
  process.env.JWT_PUBLIC_KEY = keys.publicKey;
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);
function sign(claims: Record<string, unknown>, key = keys.privateKey): string {
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64(claims);
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${body}`);
  signer.end();
  return `${head}.${body}.${signer.sign(key, "base64url")}`;
}
const claims = (over: Record<string, unknown> = {}) => ({ iss: "zeno-api", aud: "zeno-mobile", sub: "acct_live", iat: now() - 10, exp: now() + 600, ...over });

describe("F88: unknown and revoked tokens are indistinguishable to the caller", () => {
  it("every kind of rejected token gets the same 401: status, body (minus the request id) and response headers", async () => {
    const { buildApp } = await import("./app");
    const app = await buildApp();
    // A real account, then deleted: its still-unexpired token is revoked (F76).
    const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: "192.0.2.1", payload: { email: "revoked@zeno.test" } });
    const raw = decodeURIComponent(String(requested.json().data.devLink).split("token=")[1]!);
    const session = (await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}`, remoteAddress: "192.0.2.1" })).json().data;
    const deleted = await app.inject({ method: "DELETE", url: "/api/v1/account", remoteAddress: "192.0.2.1", headers: { authorization: `Bearer ${session.accessToken}` } });
    expect(deleted.json().data).toEqual({ deleted: true });

    const kinds: Record<string, string | undefined> = {
      "revoked (a deleted account's token)": session.accessToken as string,
      "expired": sign(claims({ exp: now() - 5 })),
      "signed by a foreign key": sign(claims(), foreign.privateKey),
      "the wrong audience": sign(claims({ aud: "zeno-web" })),
      "not a JWT at all": "not.a.jwt",
      "no token": undefined
    };
    const seen = await Promise.all(Object.entries(kinds).map(async ([kind, token], i) => {
      const r = await app.inject({
        method: "GET", url: "/api/v1/sync/pull", remoteAddress: `198.51.100.${i + 1}`,
        headers: token === undefined ? {} : { authorization: `Bearer ${token}` }
      });
      const body = r.json() as { meta?: unknown };
      // Values that legitimately differ per request: the id, the clock, the length (ids vary in length).
      const headers = Object.fromEntries(Object.entries(r.headers).filter(([name]) => !["x-request-id", "date", "content-length"].includes(name)));
      return { kind, status: r.statusCode, body: { ...body, meta: undefined }, headers };
    }));
    const [first, ...rest] = seen;
    expect(first!.status).toBe(401);
    for (const other of rest) {
      expect({ status: other.status, body: other.body, headers: other.headers }, `${other.kind} vs ${first!.kind}`)
        .toEqual({ status: first!.status, body: first!.body, headers: first!.headers });
    }
  });

  it("the token check takes the same time for revoked, expired, unknown-signer and live tokens (within 25 %; measured about 3 % apart)", async () => {
    const auth = await import("./routes/auth");
    const tokens: Record<string, string> = {
      live: sign(claims()),
      revoked: sign(claims({ sub: "acct_gone" })),
      expired: sign(claims({ exp: now() - 5 })),
      foreignKey: sign(claims(), foreign.privateKey)
    };
    expect(auth.verifyAccessToken(tokens.live!)).not.toBeNull();
    expect(await auth.revokeAccessTokensForAccount("acct_gone")).toBe(true);
    expect(auth.verifyAccessToken(tokens.revoked!)).toBeNull();

    const samples: Record<string, number[]> = Object.fromEntries(Object.keys(tokens).map((k) => [k, []]));
    for (let i = 0; i < 200; i += 1) for (const t of Object.values(tokens)) auth.verifyAccessToken(t); // warm up
    // Round-robin, so any drift (GC, a noisy CI neighbour) hits every kind alike.
    for (let i = 0; i < 1000; i += 1) {
      for (const [kind, token] of Object.entries(tokens)) {
        const start = process.hrtime.bigint();
        auth.verifyAccessToken(token);
        samples[kind]!.push(Number(process.hrtime.bigint() - start));
      }
    }
    const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1]!;
    const medians = Object.fromEntries(Object.entries(samples).map(([kind, values]) => [kind, median(values)]));
    const revoked = medians.revoked!;
    for (const kind of ["live", "expired", "foreignKey"]) {
      const ratio = revoked / medians[kind]!;
      expect(ratio, `revoked vs ${kind}: ${JSON.stringify(medians)} ns`).toBeGreaterThan(0.75);
      expect(ratio, `revoked vs ${kind}: ${JSON.stringify(medians)} ns`).toBeLessThan(1.25);
    }
  }, 60_000);
});
