import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { coachSystemPrompt } from "./coach";

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("api app", () => {
  it("returns the API health envelope", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.data.status).toBe("ok");
    expect(body.error).toBeNull();
    expect(body.meta.requestId).toBeTruthy();
  });

  it("uses dev magic-link auth without password storage", async () => {
    const app = await buildApp();

    const request = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link/request",
      payload: { email: "dev@subradar.local" }
    });
    expect(request.statusCode).toBe(200);
    const requestBody = request.json();
    expect(requestBody.data.devCode).toMatch(/^\d{6}$/);

    const verify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link/verify",
      payload: { email: "dev@subradar.local", code: requestBody.data.devCode }
    });
    const body = verify.json();

    expect(verify.statusCode).toBe(200);
    expect(body.data.tokenType).toBe("Bearer");
  });

  it("allows the local demo account outside production only", async () => {
    const app = await buildApp();
    const demoPassword = "test-only-demo-password";

    process.env.DEMO_LOGIN_PASSWORD = demoPassword;
    try {
      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/demo-login",
        payload: { email: "demo@zeno.local", password: demoPassword }
      });
      expect(login.statusCode).toBe(200);
      expect(login.json().data.tokenType).toBe("Bearer");

      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        const blocked = await app.inject({
          method: "POST",
          url: "/api/v1/auth/demo-login",
          payload: { email: "demo@zeno.local", password: demoPassword }
        });
        expect(blocked.statusCode).toBe(404);
      } finally {
        if (previousNodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = previousNodeEnv;
        }
      }
    } finally {
      delete process.env.DEMO_LOGIN_PASSWORD;
    }

    const disabled = await app.inject({
      method: "POST",
      url: "/api/v1/auth/demo-login",
      payload: { email: "demo@zeno.local", password: demoPassword }
    });
    expect(disabled.statusCode).toBe(404);
  });

  it("rejects unencrypted sync payloads by schema", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sync/push",
      headers: { "x-zeno-user-id": "schema-test-user" },
      payload: { subscriptions: [{ name: "Netflix", amount: 1549 }] }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("BAD_REQUEST");
  });

  it("returns service detail by slug", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/services/adobe-creative-cloud" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.data.service.cancellationDifficulty).toBe("dark_pattern");
  });

  it("creates dev open-banking intents without bank credentials", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "POST", url: "/api/v1/open-banking/plaid/intent" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.data.intent.scopes).toEqual(["transactions_read"]);
    expect(body.data.intent.serverSeesCredentials).toBe(false);
  });

  it("returns scale foundation manifests", async () => {
    const app = await buildApp();
    const partners = await app.inject({ method: "GET", url: "/api/v1/partners" });
    const keys = await app.inject({ method: "GET", url: "/api/v1/public-api/keys" });

    expect(partners.statusCode).toBe(200);
    expect(partners.json().data.integrations.length).toBeGreaterThanOrEqual(5);
    expect(keys.json().data.keys[0].maskedKey).toContain("sr_dev_");
  });

  it("returns the fail envelope when the rate limit is exceeded", async () => {
    const app = await buildApp();

    let limited: Awaited<ReturnType<typeof app.inject>> | undefined;
    for (let attempt = 0; attempt < 101; attempt += 1) {
      const response = await app.inject({ method: "GET", url: "/api/v1/account" });
      if (response.statusCode === 429) {
        limited = response;
        break;
      }
    }

    expect(limited).toBeDefined();
    const body = limited!.json();
    expect(limited!.statusCode).toBe(429);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.meta.requestId).toBeTruthy();
  });

  it("returns the fail envelope for unknown routes", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/does-not-exist" });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.meta.requestId).toBeTruthy();
  });

  it("caps the services listing and reports totals", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/services?limit=500" });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.data.limit).toBe(100);
    expect(body.data.services.length).toBeLessThanOrEqual(100);
    expect(body.data.services.length).toBe(body.data.returned);
    expect(body.data.total).toBeGreaterThan(100);
    expect(body.data.total).toBeGreaterThan(body.data.services.length);
  });

  it("paginates the services listing with limit and offset", async () => {
    const app = await buildApp();
    const first = await app.inject({ method: "GET", url: "/api/v1/services?limit=5&offset=0" });
    const second = await app.inject({ method: "GET", url: "/api/v1/services?limit=5&offset=5" });

    expect(first.statusCode).toBe(200);
    expect(first.json().data.services.length).toBe(5);
    expect(first.json().data.offset).toBe(0);
    expect(second.json().data.offset).toBe(5);
    expect(second.json().data.services[0].slug).not.toBe(first.json().data.services[0].slug);
  });

  it("rotates refresh tokens and logs out cleanly", async () => {
    const app = await buildApp();

    const request = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link/request",
      payload: { email: "refresh@subradar.local" }
    });
    const verify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link/verify",
      payload: { email: "refresh@subradar.local", code: request.json().data.devCode }
    });
    const session = verify.json().data;
    expect(session.refreshToken).toBeTruthy();

    const refreshed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: session.refreshToken }
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().data.tokenType).toBe("Bearer");
    expect(refreshed.json().data.refreshToken).not.toBe(session.refreshToken);

    // A rotated refresh token must not be reusable.
    const reused = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: session.refreshToken }
    });
    expect(reused.statusCode).toBe(401);
    expect(reused.json().error.code).toBe("UNAUTHORIZED");

    const rotatedToken = refreshed.json().data.refreshToken;
    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      payload: { refreshToken: rotatedToken }
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.json().data.loggedOut).toBe(true);

    // After logout the refresh token is revoked.
    const afterLogout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: rotatedToken }
    });
    expect(afterLogout.statusCode).toBe(401);
  });

  it("refuses unverified OAuth tokens under production", async () => {
    const app = await buildApp();

    const previousNodeEnv = process.env.NODE_ENV;
    const previousFlag = process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS;
    process.env.NODE_ENV = "production";
    process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = "true";
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/google",
        payload: { accessToken: "unverified-access-token-from-client" }
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
      if (previousFlag === undefined) {
        delete process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS;
      } else {
        process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS = previousFlag;
      }
    }
  });

  it("returns a free/unconfigured entitlement when RevenueCat is not set up", async () => {
    const previousKey = process.env.REVENUECAT_SECRET_KEY;
    delete process.env.REVENUECAT_SECRET_KEY;
    try {
      const app = await buildApp();
      const response = await app.inject({ method: "GET", url: "/api/v1/billing/entitlement?appUserId=fresh-user-1" });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.plan).toBe("free");
      expect(body.data.source).toBe("unconfigured");
    } finally {
      if (previousKey === undefined) delete process.env.REVENUECAT_SECRET_KEY;
      else process.env.REVENUECAT_SECRET_KEY = previousKey;
    }
  });

  it("rejects an unauthorized RevenueCat webhook and trusts an authorized one", async () => {
    const previousAuth = process.env.REVENUECAT_WEBHOOK_AUTH;
    process.env.REVENUECAT_WEBHOOK_AUTH = "test-webhook-secret";
    try {
      const app = await buildApp();
      const appUserId = "webhook-user-1";
      const payload = { event: { app_user_id: appUserId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } };

      const bad = await app.inject({
        method: "POST",
        url: "/api/v1/billing/webhook",
        headers: { authorization: "Bearer wrong" },
        payload
      });
      expect(bad.statusCode).toBe(401);

      const good = await app.inject({
        method: "POST",
        url: "/api/v1/billing/webhook",
        headers: { authorization: "Bearer test-webhook-secret" },
        payload
      });
      expect(good.statusCode).toBe(200);

      // The webhook updated the server's source of truth → entitlement reflects Pro.
      const entitlement = await app.inject({ method: "GET", url: `/api/v1/billing/entitlement?appUserId=${appUserId}` });
      expect(entitlement.json().data.plan).toBe("pro");
    } finally {
      if (previousAuth === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH;
      else process.env.REVENUECAT_WEBHOOK_AUTH = previousAuth;
    }
  });

  it("requires a user header for sync", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "POST", url: "/api/v1/sync/push", payload: { encryptedChanges: [] } });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });

  it("stores encrypted changes on push and replays them on pull (per user, LWW)", async () => {
    const app = await buildApp();
    const headers = { "x-zeno-user-id": "sync-user-A" };
    const change = (v: number, payload: string) => ({
      entityType: "subscription" as const,
      entityId: "sub_1",
      operation: "update" as const,
      encryptedPayload: payload,
      vectorClock: { deviceA: v }
    });

    const push1 = await app.inject({ method: "POST", url: "/api/v1/sync/push", headers, payload: { encryptedChanges: [change(2, "cipher-v2")] } });
    expect(push1.statusCode).toBe(200);
    expect(push1.json().data.accepted).toBe(1);

    // A stale (lower-version) change is rejected, not applied.
    const stale = await app.inject({ method: "POST", url: "/api/v1/sync/push", headers, payload: { encryptedChanges: [change(1, "cipher-v1")] } });
    expect(stale.json().data.rejected).toBe(1);

    const pull = await app.inject({ method: "GET", url: "/api/v1/sync/pull", headers });
    const body = pull.json();
    expect(body.data.encryptedChanges).toHaveLength(1);
    expect(body.data.encryptedChanges[0].encryptedPayload).toBe("cipher-v2");
    expect(body.data.serverStoresFinancialData).toBe(false);

    // A different user sees none of user A's data.
    const other = await app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: { "x-zeno-user-id": "sync-user-B" } });
    expect(other.json().data.encryptedChanges).toHaveLength(0);
  });

  it("creates a household and lets a member join by share code", async () => {
    const app = await buildApp();
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      payload: { ownerId: "owner-1", ownerName: "Maya", monthlySpendMinor: 5000 }
    });
    expect(create.statusCode).toBe(200);
    const household = create.json().data.household;
    expect(household.shareCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(household.members).toHaveLength(1);

    const join = await app.inject({
      method: "POST",
      url: "/api/v1/family/join",
      payload: { shareCode: household.shareCode, memberId: "member-2", memberName: "Liam", monthlySpendMinor: 3000 }
    });
    expect(join.statusCode).toBe(200);
    const joined = join.json().data.household;
    expect(joined.members.map((m: { name: string }) => m.name).sort()).toEqual(["Liam", "Maya"]);

    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/family/join",
      payload: { shareCode: "ZZZZZZ", memberId: "x", memberName: "X" }
    });
    expect(bad.statusCode).toBe(404);
  });

  it("reports the AI coach as unconfigured when no provider key is set", async () => {
    const saved = {
      anthropic: process.env.ANTHROPIC_API_KEY,
      groq: process.env.GROQ_API_KEY,
      provider: process.env.COACH_PROVIDER
    };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.COACH_PROVIDER;
    try {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/coach",
        payload: {
          totalMonthlyMinor: 4599,
          subscriptions: [{ name: "Netflix", category: "entertainment", monthlyMinor: 1549, billingCycle: "monthly" }]
        }
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().data.source).toBe("unconfigured");
    } finally {
      restoreEnv("ANTHROPIC_API_KEY", saved.anthropic);
      restoreEnv("GROQ_API_KEY", saved.groq);
      restoreEnv("COACH_PROVIDER", saved.provider);
    }
  });

  it("rejects a malformed AI coach request", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/coach",
      payload: { totalMonthlyMinor: -5, subscriptions: [] }
    });
    expect(response.statusCode).toBe(400);
  });

  it("sets security headers on responses (helmet)", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["strict-transport-security"]).toBeTruthy();
  });

  it("loads the AI coach constitution into the system prompt", () => {
    const prompt = coachSystemPrompt();
    // Charter loaded (persona + scope) ...
    expect(prompt).toMatch(/Zeno'?s Spend Coach/i);
    expect(prompt.toLowerCase()).toContain("subscription");
    // ... anti-jailbreak language present ...
    expect(prompt.toLowerCase()).toContain("instructions");
    // ... and the enforced output contract appended.
    expect(prompt).toContain("outOfScope");
  });
});
