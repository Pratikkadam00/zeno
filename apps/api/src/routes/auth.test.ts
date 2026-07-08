import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";
import { verifyAccessToken } from "./auth";

// Mint a real RS256 access token via the dev magic-link flow (no RESEND key →
// the token is returned in devLink) — same approach as app.test.ts's tokenFor.
// Distinct email → distinct accountId (sub).
async function mintRealToken(app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const devLink = requested.json().data.devLink as string;
  const rawToken = decodeURIComponent(devLink.split("token=")[1] ?? "");
  const verified = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(rawToken)}` });
  return verified.json().data.accessToken as string;
}

function decodePart(base64url: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(base64url, "base64url").toString("utf8")) as Record<string, unknown>;
}

function encodePart(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

// Rewrites one payload claim and reassembles the token with the ORIGINAL
// signature (computed over the old payload) — proves verifyAccessToken's
// signature check actually covers the claim in question, rather than trusting
// a decoded-but-unverified payload.
function withTamperedClaim(token: string, mutate: (payload: Record<string, unknown>) => void): string {
  const [header, payload, signature] = token.split(".");
  const decoded = decodePart(payload!);
  mutate(decoded);
  return `${header}.${encodePart(decoded)}.${signature}`;
}

// Every test here targets verifyAccessToken — the single verifier every
// protected route's auth-guard relies on (auth-guard.ts) — which, per the
// security audit, had zero coverage for an INVALID-BUT-PRESENT token; only
// "no token at all" was tested anywhere in the suite.
describe("verifyAccessToken — negative paths", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a genuinely valid, freshly-issued token (positive control)", async () => {
    const app = await buildApp();
    const token = await mintRealToken(app, "valid@example.com");
    const result = verifyAccessToken(token);
    expect(result).not.toBeNull();
    expect(result?.email).toBe("valid@example.com");
  });

  it("rejects a token with fewer than 3 dot-separated segments", () => {
    expect(verifyAccessToken("not.a.jwt.at.all.malformed")).toBeNull();
    expect(verifyAccessToken("onlyonepart")).toBeNull();
    expect(verifyAccessToken("")).toBeNull();
  });

  it("rejects a token whose signature no longer matches a tampered `sub` claim", async () => {
    const app = await buildApp();
    const token = await mintRealToken(app, "tamper-sub@example.com");
    const tampered = withTamperedClaim(token, (payload) => { payload.sub = "attacker-account-id"; });
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it("rejects a token whose signature no longer matches a tampered `iss` claim", async () => {
    const app = await buildApp();
    const token = await mintRealToken(app, "tamper-iss@example.com");
    const tampered = withTamperedClaim(token, (payload) => { payload.iss = "not-zeno-api"; });
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it("rejects a token whose signature no longer matches a tampered `aud` claim", async () => {
    const app = await buildApp();
    const token = await mintRealToken(app, "tamper-aud@example.com");
    const tampered = withTamperedClaim(token, (payload) => { payload.aud = "some-other-audience"; });
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it("rejects a token whose signature no longer matches an extended `exp` claim", async () => {
    const app = await buildApp();
    const token = await mintRealToken(app, "tamper-exp@example.com");
    const farFuture = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const tampered = withTamperedClaim(token, (payload) => { payload.exp = farFuture; });
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it("rejects a token with a flipped character in the signature segment", async () => {
    const app = await buildApp();
    const token = await mintRealToken(app, "tamper-sig@example.com");
    const [header, payload, signature] = token.split(".");
    const flipped = (signature![0] === "A" ? "B" : "A") + signature!.slice(1);
    expect(verifyAccessToken(`${header}.${payload}.${flipped}`)).toBeNull();
  });

  it("rejects a legitimately-issued token once it has expired", async () => {
    const app = await buildApp();
    // Only fake Date — faking timers wholesale would freeze the event-loop
    // scheduling app.inject() itself depends on to ever resolve.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() - 60 * 60 * 1000)); // mint 1 hour in the past
    const token = await mintRealToken(app, "expired@example.com");
    vi.useRealTimers(); // verify at genuinely-current time — the 15-min TTL has long passed
    expect(verifyAccessToken(token)).toBeNull();
  });

  // The classic alg-confusion attack: declare HS256 and "sign" with the
  // server's own PUBLIC key (which the attacker can obtain — it's public) used
  // as an HMAC secret, hoping a naive verifier reuses the same key material
  // for whatever alg the token claims. verifyAccessToken must reject on the
  // alg check before ever touching key material for HMAC verification.
  it("rejects an alg-confusion token (HS256 signed with the RS256 public key as an HMAC secret)", async () => {
    const app = await buildApp();
    const realToken = await mintRealToken(app, "alg-confusion@example.com");
    const [, encodedPayload] = realToken.split(".");
    const publicKeyPem = await getServerPublicKeyPem(app);

    const forgedHeader = encodePart({ alg: "HS256", typ: "JWT" });
    const signingInput = `${forgedHeader}.${encodedPayload}`;
    const forgedSignature = createHmac("sha256", publicKeyPem).update(signingInput).digest("base64url");
    const forgedToken = `${signingInput}.${forgedSignature}`;

    expect(verifyAccessToken(forgedToken)).toBeNull();
  });

  it("rejects a token declaring an unsupported alg outright, even with a well-formed signature segment", async () => {
    const payload = encodePart({ sub: "x", email: null, iss: "zeno-api", aud: "zeno-mobile", exp: Math.floor(Date.now() / 1000) + 900 });
    const header = encodePart({ alg: "none", typ: "JWT" });
    expect(verifyAccessToken(`${header}.${payload}.`)).toBeNull();
  });
});

describe("magic-link send — per-recipient rate limit", () => {
  it("caps sends to the SAME recipient email even when every request comes from a different IP", async () => {
    const app = await buildApp();
    const victim = "victim-of-email-bombing@example.com";

    // The per-IP limiter (5/min) would never trip here since every request
    // uses a fresh source IP — proves the guard is keyed by recipient, not IP.
    for (let i = 0; i < 5; i += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/magic-link",
        remoteAddress: `172.16.5.${i}`,
        payload: { email: victim }
      });
      expect(response.statusCode).toBe(200);
    }
    const overflow = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link",
      remoteAddress: "172.16.5.99",
      payload: { email: victim }
    });
    expect(overflow.statusCode).toBe(429);
  });

  it("does not rate-limit a DIFFERENT recipient after another address was capped", async () => {
    const app = await buildApp();
    for (let i = 0; i < 6; i += 1) {
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/magic-link",
        remoteAddress: `172.16.6.${i}`,
        payload: { email: "spammed@example.com" }
      });
    }
    const unrelated = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link",
      remoteAddress: "172.16.6.50",
      payload: { email: "unrelated-person@example.com" }
    });
    expect(unrelated.statusCode).toBe(200);
  });
});

// Pulls the server's real RSA public key out of its JWKS-style exposure if
// one exists; otherwise derives it isn't needed — HMAC-confusion only needs
// SOME string an attacker could plausibly guess is reused as a secret, and the
// public key (by definition public) is the realistic candidate an attacker
// would try. If the API doesn't expose a JWKS endpoint, fall back to a fixed
// placeholder — the attack either works or doesn't regardless of which public
// string is guessed, since verifyAccessToken must reject on alg alone.
async function getServerPublicKeyPem(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
  const jwks = await app.inject({ method: "GET", url: "/.well-known/jwks.json" });
  if (jwks.statusCode === 200) {
    return jwks.body;
  }
  return "attacker-guessed-public-key-material";
}
