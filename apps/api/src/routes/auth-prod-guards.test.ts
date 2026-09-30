import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";

/**
 * Production fail-closed guards.
 *
 * Two env flags exist for local development that would be catastrophic if they
 * ever took effect on a deployed server:
 *   - ALLOW_UNVERIFIED_OAUTH_TOKENS: skips JWKS signature verification of
 *     Apple/Google identity tokens. If honoured in production, anyone could mint
 *     an unsigned token asserting any `sub` and take over any account.
 *   - DEMO_LOGIN_ENABLED / DEMO_LOGIN_PASSWORD: a shared-password login.
 *
 * Both are gated on NODE_ENV !== "production" in auth.ts. These tests pin that
 * behaviour so the guard cannot be loosened without a failing test.
 */

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("ALLOW_UNVERIFIED_OAUTH_TOKENS is refused in production", () => {
  it("an unverified Apple identity token is REJECTED when NODE_ENV=production, even with the flag set", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = "true";
    // NO Apple client id: the unverified-token flag is only consulted when no
    // audience is configured, so this is the only setup in which the production
    // refusal is what stands between a forged token and a session (finding F24:
    // with an audience set, this test passed even with the guard removed).
    delete process.env.APPLE_CLIENT_ID;
    delete process.env.APPLE_BUNDLE_ID;
    // Required so buildApp() doesn't refuse to boot in production mode.
    process.env.AUTH_JWT_PRIVATE_KEY_PEM ??= "";

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/apple",
      // A schema-valid nonce so the request REACHES the verification path the
      // production guard protects (a short nonce would 400 at the schema and
      // this test would pass even if the flag were honoured).
      payload: { identityToken: "not.a.real.token", nonce: "0123456789abcdef0123456789abcdef" }
    });
    // Must NOT mint a session off an unverified token.
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.json().data ?? null).toBeNull();
    await app.close();
  });

  it("an unverified Google identity token is REJECTED when NODE_ENV=production, even with the flag set", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = "true";
    // NO Google client ids, for the same reason as the Apple case above (F24).
    for (const key of ["GOOGLE_EXPO_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID", "GOOGLE_IOS_CLIENT_ID", "GOOGLE_ANDROID_CLIENT_ID"]) delete process.env[key];

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/google",
      payload: { idToken: "not.a.real.token", nonce: "0123456789abcdef0123456789abcdef" }
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.json().data ?? null).toBeNull();
    await app.close();
  });
});

describe("demo login is refused in production", () => {
  // F24: this test used to post to "/api/v1/auth/demo" (no such route → 404)
  // with no email and a 7-character password (→ 400 at the schema), so it passed
  // even with the production guard removed. The request below is VALID — the
  // positive control proves it signs in outside production — so the only thing
  // that can refuse it in production is the guard itself.
  const DEMO = { email: "demo@zeno.local", password: "demo-password-123" };
  async function tryDemo(nodeEnv: string) {
    process.env.NODE_ENV = nodeEnv;
    process.env.DEMO_LOGIN_ENABLED = "true";
    process.env.DEMO_LOGIN_PASSWORD = DEMO.password;
    delete process.env.DEMO_LOGIN_EMAIL;
    const app = await buildApp();
    const response = await app.inject({ method: "POST", url: "/api/v1/auth/demo-login", payload: DEMO });
    await app.close();
    return response;
  }

  it("positive control: the same request signs in when NOT in production", async () => {
    const response = await tryDemo("development");
    expect(response.statusCode).toBe(200);
    expect(response.json().data.accessToken).toBeTruthy();
  });

  it("does not issue a session from DEMO_LOGIN_PASSWORD when NODE_ENV=production", async () => {
    const response = await tryDemo("production");
    expect(response.statusCode).toBe(404);
    expect(response.json().error.message).toBe("Demo login is not enabled.");
    expect(response.json().data ?? null).toBeNull();
  });
});
