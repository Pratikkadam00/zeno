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
    process.env.APPLE_CLIENT_ID = "app.zeno.mobile";
    // Required so buildApp() doesn't refuse to boot in production mode.
    process.env.AUTH_JWT_PRIVATE_KEY_PEM ??= "";

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/apple",
      payload: { identityToken: "not.a.real.token", nonce: "n" }
    });
    // Must NOT mint a session off an unverified token.
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.json().data ?? null).toBeNull();
    await app.close();
  });

  it("an unverified Google identity token is REJECTED when NODE_ENV=production, even with the flag set", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = "true";
    process.env.GOOGLE_WEB_CLIENT_ID = "web-client";

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/google",
      payload: { idToken: "not.a.real.token" }
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.json().data ?? null).toBeNull();
    await app.close();
  });
});

describe("demo login is refused in production", () => {
  it("does not issue a session from DEMO_LOGIN_PASSWORD when NODE_ENV=production", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEMO_LOGIN_ENABLED = "true";
    process.env.DEMO_LOGIN_PASSWORD = "hunter2";

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/demo",
      payload: { password: "hunter2" }
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.json().data ?? null).toBeNull();
    await app.close();
  });
});
