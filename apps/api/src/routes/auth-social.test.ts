import { createSign, generateKeyPairSync, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Apple / Google sign-in against REAL RS256-signed identity tokens. A local RSA
 * key is published through a mocked JWKS endpoint, so the server's actual
 * verifier (signature, kid, alg, exp, iss, aud, nonce) runs end to end. Before
 * this suite, no test ever verified a correctly signed social token.
 *
 * F10: the token must carry nonce === SHA-256(raw), where the raw nonce is
 *      sent by the app and never given to the provider.
 * F23: the session email comes ONLY from the verified token, never the body.
 */
const jwks = vi.hoisted(() => ({ keys: [] as unknown[], calls: [] as string[], fail: false }));
vi.mock("../http", () => ({
  fetchWithTimeout: vi.fn(async (url: string) => {
    jwks.calls.push(String(url));
    if (jwks.fail) return { ok: false, status: 503, json: async () => ({}) } as unknown as Response;
    return { ok: true, status: 200, json: async () => ({ keys: jwks.keys }) } as unknown as Response;
  })
}));

const { buildApp } = await import("../app");
const { nonceHash } = await import("./auth");

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "test-key-1";
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");

function sign(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: "RS256", kid: KID }, key = privateKey): string {
  const head = b64(header);
  const body = b64(payload);
  const s = createSign("RSA-SHA256");
  s.update(`${head}.${body}`);
  s.end();
  return `${head}.${body}.${s.sign(key).toString("base64url")}`;
}

const APPLE_AUD = "app.zeno.mobile";
const GOOGLE_AUD = "google-web-client.apps.googleusercontent.com";
const ORIGINAL = { ...process.env };
const now = () => Math.floor(Date.now() / 1000);
const rawNonce = () => randomBytes(16).toString("hex");

beforeEach(() => {
  process.env = { ...ORIGINAL, NODE_ENV: "test", APPLE_CLIENT_ID: APPLE_AUD, GOOGLE_WEB_CLIENT_ID: GOOGLE_AUD };
  delete process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS;
  jwks.keys = [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }];
  jwks.calls.length = 0;
  jwks.fail = false;
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

const appleClaims = (nonce: string, over: Record<string, unknown> = {}) => ({
  iss: "https://appleid.apple.com", aud: APPLE_AUD, sub: "apple-user-001", email: "real@privaterelay.appleid.com", exp: now() + 600, nonce: nonceHash(nonce), ...over
});
const googleClaims = (nonce: string, over: Record<string, unknown> = {}) => ({
  iss: "https://accounts.google.com", aud: GOOGLE_AUD, sub: "google-user-001", email: "real@gmail.com", exp: now() + 600, nonce: nonceHash(nonce), ...over
});
const claimsOf = (accessToken: string) => JSON.parse(Buffer.from(accessToken.split(".")[1]!, "base64url").toString("utf8")) as Record<string, unknown>;

async function post(url: string, payload: Record<string, unknown>) {
  const app = await buildApp();
  const res = await app.inject({ method: "POST", url, payload });
  await app.close();
  return res;
}

describe("nonceHash", () => {
  it("is lowercase hex SHA-256 of the raw value", () => {
    expect(nonceHash("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("POST /api/v1/auth/apple", () => {
  it("a valid token with the matching nonce signs in; the session email is the TOKEN's (F23)", async () => {
    const n = rawNonce();
    const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n)), nonce: n, email: "attacker@evil.example" });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.accountId).toMatch(/^acct_apple_/);
    expect(claimsOf(data.accessToken).email).toBe("real@privaterelay.appleid.com");
  });

  it("with no email in the token, the session gets a synthetic address — still never the body's", async () => {
    const n = rawNonce();
    const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n, { email: undefined })), nonce: n, email: "attacker@evil.example" });
    expect(res.statusCode).toBe(200);
    const email = claimsOf(res.json().data.accessToken).email as string;
    expect(email).toMatch(/^apple-.+@privaterelay\.appleid\.com$/);
    expect(email).not.toContain("attacker");
  });

  it("F10: a missing nonce is rejected before any verification (400)", async () => {
    const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(rawNonce())) });
    expect(res.statusCode).toBe(400);
    expect(jwks.calls).toHaveLength(0);
  });

  it("F10: a replayed token (raw nonce unknown to the attacker) is rejected", async () => {
    const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(rawNonce())), nonce: rawNonce() });
    expect(res.statusCode).toBe(401);
  });

  it("F10: a token without any nonce claim is rejected", async () => {
    const n = rawNonce();
    const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n, { nonce: undefined })), nonce: n });
    expect(res.statusCode).toBe(401);
  });

  it("F10: a token whose nonce is the RAW value (not its hash) is rejected", async () => {
    const n = rawNonce();
    const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n, { nonce: n })), nonce: n });
    expect(res.statusCode).toBe(401);
  });

  const rejectCases: Array<[string, (n: string) => string]> = [
    ["expired", (n) => sign(appleClaims(n, { exp: now() - 1 }))],
    ["no expiry", (n) => sign(appleClaims(n, { exp: undefined }))],
    ["no subject", (n) => sign(appleClaims(n, { sub: undefined }))],
    ["wrong issuer", (n) => sign(appleClaims(n, { iss: "https://evil.example" }))],
    ["no issuer", (n) => sign(appleClaims(n, { iss: undefined }))],
    ["wrong audience", (n) => sign(appleClaims(n, { aud: "someone-else" }))],
    ["no audience", (n) => sign(appleClaims(n, { aud: undefined }))],
    ["signed by another key", (n) => sign(appleClaims(n), undefined, generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey)],
    ["alg none", (n) => `${b64({ alg: "none", kid: KID })}.${b64(appleClaims(n))}.`],
    ["HS256", (n) => sign(appleClaims(n), { alg: "HS256", kid: KID })],
    ["no kid", (n) => sign(appleClaims(n), { alg: "RS256" })],
    ["not three parts (long enough to pass the schema)", () => "aaaaaaaaaa.bbbbbbbbbb"],
    ["tampered payload", (n) => { const [h, , s] = sign(appleClaims(n)).split("."); return `${h}.${b64(appleClaims(n, { sub: "someone-else" }))}.${s}`; }]
  ];
  for (const [label, make] of rejectCases) {
    it(`rejects a token that is ${label}`, async () => {
      const n = rawNonce();
      const res = await post("/api/v1/auth/apple", { identityToken: make(n), nonce: n });
      expect(res.statusCode, label).toBe(401);
      expect(res.json().data ?? null).toBeNull();
    });
  }

  it("an audience array containing ours is accepted", async () => {
    const n = rawNonce();
    const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n, { aud: ["other", APPLE_AUD] })), nonce: n });
    expect(res.statusCode).toBe(200);
  });

  it("rejects when no Apple client id is configured (never trusts an unverified token)", async () => {
    delete process.env.APPLE_CLIENT_ID;
    delete process.env.APPLE_BUNDLE_ID;
    const n = rawNonce();
    expect((await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n)), nonce: n })).statusCode).toBe(401);
  });
});

describe("POST /api/v1/auth/google", () => {
  it("a valid token with the matching nonce signs in; the session email is the TOKEN's (F23)", async () => {
    const n = rawNonce();
    const res = await post("/api/v1/auth/google", { idToken: sign(googleClaims(n)), nonce: n, email: "attacker@evil.example" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accountId).toMatch(/^acct_google_/);
    expect(claimsOf(res.json().data.accessToken).email).toBe("real@gmail.com");
  });

  it("accepts both of Google's issuer spellings", async () => {
    const n = rawNonce();
    expect((await post("/api/v1/auth/google", { idToken: sign(googleClaims(n, { iss: "accounts.google.com" })), nonce: n })).statusCode).toBe(200);
  });

  it("F10: an idToken without a nonce is a 400", async () => {
    expect((await post("/api/v1/auth/google", { idToken: sign(googleClaims(rawNonce())) })).statusCode).toBe(400);
  });

  it("F10: a mismatched nonce is a 401", async () => {
    expect((await post("/api/v1/auth/google", { idToken: sign(googleClaims(rawNonce())), nonce: rawNonce() })).statusCode).toBe(401);
  });

  it("without an idToken (access token only) it refuses when real verification is configured", async () => {
    expect((await post("/api/v1/auth/google", { accessToken: "ya29.some-access-token" })).statusCode).toBe(401);
  });
});

describe("JWKS handling", () => {
  it("caches the provider's keys: a second sign-in does not refetch", async () => {
    const a = rawNonce();
    const b = rawNonce();
    await post("/api/v1/auth/google", { idToken: sign(googleClaims(a, { sub: "cache-1" })), nonce: a });
    const after = jwks.calls.length;
    await post("/api/v1/auth/google", { idToken: sign(googleClaims(b, { sub: "cache-2" })), nonce: b });
    expect(jwks.calls.length).toBe(after);
  });

  it("an unknown kid triggers exactly one forced refetch (key rotation) once the cached set is 30 s old, then fails closed; another right after does not refetch (F83)", async () => {
    const n = rawNonce();
    await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n)), nonce: n }); // warm the cache
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 30_000);
      const before = jwks.calls.length;
      const rotated = { identityToken: sign(appleClaims(n), { alg: "RS256", kid: "rotated-away" }), nonce: n };
      expect((await post("/api/v1/auth/apple", rotated)).statusCode).toBe(401);
      expect(jwks.calls.length - before).toBe(1);
      expect((await post("/api/v1/auth/apple", rotated)).statusCode).toBe(401);
      expect(jwks.calls.length - before).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a JWKS outage fails closed (401), never open", async () => {
    // A key id never cached forces a fetch (past the refresh cooldown), which fails.
    jwks.fail = true;
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 120_000);
      const before = jwks.calls.length;
      const n = rawNonce();
      const res = await post("/api/v1/auth/apple", { identityToken: sign(appleClaims(n), { alg: "RS256", kid: "never-cached" }), nonce: n });
      expect(res.statusCode).toBe(401);
      expect(jwks.calls.length - before).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
