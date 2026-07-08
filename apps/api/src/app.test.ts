import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { applyWebhookEvent, getCachedEntitlement } from "./billing";
import { coachSystemPrompt } from "./coach";
import { getStoredPlaidItem, storePlaidItem } from "./plaid";

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

// Mint a real RS256 access token via the dev magic-link flow (no RESEND key →
// the token is returned in devLink). Distinct email → distinct accountId (sub).
async function tokenFor(app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<{ token: string; accountId: string; refreshToken: string }> {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const devLink = requested.json().data.devLink as string;
  const rawToken = decodeURIComponent(devLink.split("token=")[1] ?? "");
  const verified = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(rawToken)}` });
  const data = verified.json().data;
  return { token: data.accessToken as string, accountId: data.accountId as string, refreshToken: data.refreshToken as string };
}

function authH(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
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

  it("readiness probe reports ready with postgres 'skipped' when no DB is configured", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/health/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe("ready");
    expect(response.json().data.checks.postgres).toBe("skipped");
  });

  it("exposes the request id as an x-request-id response header", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.headers["x-request-id"]).toBeTruthy();
    // The header matches the id echoed in the JSON envelope.
    expect(response.headers["x-request-id"]).toBe(response.json().meta.requestId);
  });

  it("exposes Prometheus metrics that count served requests", async () => {
    const app = await buildApp();
    // Serve a couple of requests so there is something to count.
    await app.inject({ method: "GET", url: "/health" });
    await app.inject({ method: "GET", url: "/api/v1/health" });

    const response = await app.inject({ method: "GET", url: "/metrics" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    const body = response.body;
    expect(body).toContain("# TYPE zeno_http_requests_total counter");
    // The /health GET we just served is recorded with a 2xx status class.
    expect(body).toMatch(/zeno_http_requests_total\{method="GET",route="\/health",status="2xx"\} \d+/);
    expect(body).toContain("zeno_http_in_flight_requests");
  });

  it("accepts a valid product-funnel event with no auth (local-only users must be able to call this)", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event: "free_cap_hit" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.recorded).toBe(true);

    const metrics = await app.inject({ method: "GET", url: "/metrics" });
    expect(metrics.body).toContain('zeno_product_events_total{event="free_cap_hit"} 1');
  });

  it("accepts a valid product-funnel event with an allowed label", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event: "paywall_purchase_completed", label: "zeno_pro_lifetime" }
    });
    expect(response.statusCode).toBe(200);

    const metrics = await app.inject({ method: "GET", url: "/metrics" });
    expect(metrics.body).toContain('zeno_product_events_total{event="paywall_purchase_completed",label="zeno_pro_lifetime"} 1');
  });

  it("rejects an unknown event or an out-of-allowlist label with 400, not a silently-dropped 200", async () => {
    const app = await buildApp();
    const unknown = await app.inject({ method: "POST", url: "/api/v1/events", payload: { event: "made_up_event" } });
    expect(unknown.statusCode).toBe(400);

    const badLabel = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { event: "paywall_purchase_completed", label: "not_a_real_sku" }
    });
    expect(badLabel.statusCode).toBe(400);
  });

  it("gates /metrics behind METRICS_TOKEN when it is set", async () => {
    const original = process.env.METRICS_TOKEN;
    process.env.METRICS_TOKEN = "secret-scrape-token";
    try {
      const app = await buildApp();
      const denied = await app.inject({ method: "GET", url: "/metrics" });
      expect(denied.statusCode).toBe(401);

      const allowed = await app.inject({
        method: "GET",
        url: "/metrics",
        headers: { authorization: "Bearer secret-scrape-token" }
      });
      expect(allowed.statusCode).toBe(200);
      expect(allowed.body).toContain("zeno_http_requests_total");
    } finally {
      restoreEnv("METRICS_TOKEN", original);
    }
  });

  it("uses dev magic-link auth without password storage", async () => {
    const app = await buildApp();

    const request = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link/request",
      payload: { email: "dev@zeno.local" }
    });
    expect(request.statusCode).toBe(200);
    const requestBody = request.json();
    expect(requestBody.data.devCode).toMatch(/^\d{6}$/);

    const verify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link/verify",
      payload: { email: "dev@zeno.local", code: requestBody.data.devCode }
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
    const { token } = await tokenFor(app, "schema-test@zeno.test");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sync/push",
      headers: authH(token),
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
    const { token } = await tokenFor(app, "ob@zeno.test");
    const response = await app.inject({ method: "POST", url: "/api/v1/open-banking/plaid/intent", headers: authH(token) });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.data.intent.scopes).toEqual(["transactions_read"]);
    expect(body.data.intent.serverSeesCredentials).toBe(false);
  });

  it("returns scale foundation manifests", async () => {
    const app = await buildApp();
    const { token } = await tokenFor(app, "scale@zeno.test");
    const partners = await app.inject({ method: "GET", url: "/api/v1/partners" });
    const keys = await app.inject({ method: "GET", url: "/api/v1/public-api/keys", headers: authH(token) });

    expect(partners.statusCode).toBe(200);
    expect(partners.json().data.integrations.length).toBeGreaterThanOrEqual(5);
    expect(keys.json().data.keys[0].maskedKey).toContain("sr_dev_");
  });

  it("returns the fail envelope when the rate limit is exceeded", async () => {
    const app = await buildApp();

    // Use a PUBLIC route: protected routes 401 at the auth guard, which we want
    // (an unauthenticated flood is rejected cheaply before counting). The global
    // 100/min bucket is what we're asserting here.
    let limited: Awaited<ReturnType<typeof app.inject>> | undefined;
    for (let attempt = 0; attempt < 101; attempt += 1) {
      const response = await app.inject({ method: "GET", url: "/api/v1/capabilities" });
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
      payload: { email: "refresh@zeno.local" }
    });
    const verify = await app.inject({
      method: "POST",
      url: "/api/v1/auth/magic-link/verify",
      payload: { email: "refresh@zeno.local", code: request.json().data.devCode }
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
      const { token } = await tokenFor(app, "fresh-user-1@zeno.test");
      const response = await app.inject({ method: "GET", url: "/api/v1/billing/entitlement", headers: authH(token) });
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
      // Entitlement is keyed by the authenticated account id, so the webhook's
      // app_user_id must be that same id for the read-back to match.
      const { token, accountId } = await tokenFor(app, "webhook-user@zeno.test");
      const payload = { event: { app_user_id: accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"] } };

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
      const entitlement = await app.inject({ method: "GET", url: "/api/v1/billing/entitlement", headers: authH(token) });
      expect(entitlement.json().data.plan).toBe("pro");
    } finally {
      if (previousAuth === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH;
      else process.env.REVENUECAT_WEBHOOK_AUTH = previousAuth;
    }
  });

  it("requires a valid token for sync (401 without one)", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "POST", url: "/api/v1/sync/push", payload: { encryptedChanges: [] } });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("UNAUTHORIZED");
  });

  it("stores encrypted changes on push and replays them on pull (per user, LWW)", async () => {
    const app = await buildApp();
    const a = await tokenFor(app, "sync-a@zeno.test");
    const headers = authH(a.token);
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

    // A DIFFERENT authenticated user (own token) sees none of user A's data.
    const b = await tokenFor(app, "sync-b@zeno.test");
    const other = await app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: authH(b.token) });
    expect(other.json().data.encryptedChanges).toHaveLength(0);
  });

  it("creates a household and lets a member join by share code", async () => {
    const app = await buildApp();
    const owner = await tokenFor(app, "owner@zeno.test");
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(owner.token),
      payload: { ownerName: "Maya", monthlySpendMinor: 5000 }
    });
    expect(create.statusCode).toBe(200);
    const household = create.json().data.household;
    expect(household.shareCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(household.members).toHaveLength(1);
    // Owner id comes from the token, not the body.
    expect(household.ownerId).toBe(owner.accountId);

    const member = await tokenFor(app, "member@zeno.test");
    const join = await app.inject({
      method: "POST",
      url: "/api/v1/family/join",
      headers: authH(member.token),
      payload: { shareCode: household.shareCode, memberName: "Liam", monthlySpendMinor: 3000 }
    });
    expect(join.statusCode).toBe(200);
    const joined = join.json().data.household;
    expect(joined.members.map((m: { name: string }) => m.name).sort()).toEqual(["Liam", "Maya"]);

    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/family/join",
      headers: authH(member.token),
      payload: { shareCode: "ZZZZZZ", memberName: "X" }
    });
    expect(bad.statusCode).toBe(404);
  });

  // Phase 5.2 gap fix: FamilyMember carried no currency at all, so two members
  // reporting spend in different currencies were silently summed server-side
  // as if same-currency.
  it("stores and returns each member's own currency, defaults to USD when omitted, and rejects an invalid one", async () => {
    const app = await buildApp();
    const owner = await tokenFor(app, "currency-owner@zeno.test");
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(owner.token),
      payload: { ownerName: "Owner", monthlySpendMinor: 5000, currency: "EUR" }
    });
    expect(create.statusCode).toBe(200);
    const household = create.json().data.household;
    expect(household.members[0]).toMatchObject({ currency: "EUR" });

    const member = await tokenFor(app, "currency-member@zeno.test");
    const join = await app.inject({
      method: "POST",
      url: "/api/v1/family/join",
      headers: authH(member.token),
      payload: { shareCode: household.shareCode, memberName: "Member", monthlySpendMinor: 3000, currency: "GBP" }
    });
    expect(join.statusCode).toBe(200);
    const joinedMember = join.json().data.household.members.find((m: { id: string }) => m.id === member.accountId);
    expect(joinedMember).toMatchObject({ currency: "GBP" });

    // Confirmed on a subsequent GET too — not just the create/join response.
    const fetched = await app.inject({ method: "GET", url: `/api/v1/family/${household.id}`, headers: authH(owner.token) });
    const fetchedMembers = fetched.json().data.household.members as Array<{ id: string; currency: string }>;
    expect(fetchedMembers.find((m) => m.id === owner.accountId)?.currency).toBe("EUR");
    expect(fetchedMembers.find((m) => m.id === member.accountId)?.currency).toBe("GBP");

    // Omitting currency entirely still succeeds and defaults to USD (backward
    // compatibility for a not-yet-updated client).
    const noCurrency = await tokenFor(app, "no-currency-owner@zeno.test");
    const createDefault = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(noCurrency.token),
      payload: { ownerName: "Owner" }
    });
    expect(createDefault.json().data.household.members[0]).toMatchObject({ currency: "USD" });

    // An invalid currency is rejected outright, not silently accepted.
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(owner.token),
      payload: { ownerName: "Owner", currency: "XXX" }
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.code).toBe("BAD_REQUEST");

    const lowercase = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(owner.token),
      payload: { ownerName: "Owner", currency: "usd" }
    });
    expect(lowercase.statusCode).toBe(400);
  });

  it("POST /family/:id/spend updates currency independently of monthlySpendMinor, and leaves it unchanged when omitted", async () => {
    const app = await buildApp();
    const owner = await tokenFor(app, "spend-route-owner@zeno.test");
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(owner.token),
      payload: { ownerName: "Owner", monthlySpendMinor: 1000, currency: "USD" }
    });
    const household = create.json().data.household;

    const withCurrency = await app.inject({
      method: "POST",
      url: `/api/v1/family/${household.id}/spend`,
      headers: authH(owner.token),
      payload: { monthlySpendMinor: 2000, currency: "CAD" }
    });
    expect(withCurrency.statusCode).toBe(200);
    expect(withCurrency.json().data.household.members[0]).toMatchObject({ monthlySpendMinor: 2000, currency: "CAD" });

    const withoutCurrency = await app.inject({
      method: "POST",
      url: `/api/v1/family/${household.id}/spend`,
      headers: authH(owner.token),
      payload: { monthlySpendMinor: 3000 }
    });
    expect(withoutCurrency.statusCode).toBe(200);
    // currency stays CAD from the previous call — omitting it doesn't reset to USD.
    expect(withoutCurrency.json().data.household.members[0]).toMatchObject({ monthlySpendMinor: 3000, currency: "CAD" });
  });

  it("removes a member server-side on leave, and disbands the household when the last member leaves", async () => {
    const app = await buildApp();
    const owner = await tokenFor(app, "leave-owner@zeno.test");
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(owner.token),
      payload: { ownerName: "Owner" }
    });
    const householdId = create.json().data.household.id;

    const member = await tokenFor(app, "leave-member@zeno.test");
    const shareCode = create.json().data.household.shareCode;
    await app.inject({
      method: "POST",
      url: "/api/v1/family/join",
      headers: authH(member.token),
      payload: { shareCode, memberName: "Member" }
    });

    // Member leaves: household survives with just the owner.
    const memberLeaves = await app.inject({
      method: "POST",
      url: `/api/v1/family/${householdId}/leave`,
      headers: authH(member.token)
    });
    expect(memberLeaves.statusCode).toBe(200);
    expect(memberLeaves.json().data.household.members).toHaveLength(1);

    // The member who left is no longer visible/counted server-side (this is
    // exactly what was missing before: leaving previously only cleared local
    // device storage and never told the server).
    const check = await app.inject({ method: "GET", url: `/api/v1/family/${householdId}`, headers: authH(owner.token) });
    expect(check.json().data.household.members.map((m: { name: string }) => m.name)).toEqual(["Owner"]);

    // A non-member can't leave a household they're not in.
    const stranger = await tokenFor(app, "leave-stranger@zeno.test");
    const forbidden = await app.inject({ method: "POST", url: `/api/v1/family/${householdId}/leave`, headers: authH(stranger.token) });
    expect(forbidden.statusCode).toBe(403);

    // Owner leaves last: household is disbanded (household: null) and its
    // share code is freed — joining it afterward 404s.
    const ownerLeaves = await app.inject({
      method: "POST",
      url: `/api/v1/family/${householdId}/leave`,
      headers: authH(owner.token)
    });
    expect(ownerLeaves.statusCode).toBe(200);
    expect(ownerLeaves.json().data.household).toBeNull();

    const afterDisband = await app.inject({ method: "GET", url: `/api/v1/family/${householdId}`, headers: authH(owner.token) });
    expect(afterDisband.statusCode).toBe(404);
  });

  it("caps households per owner (409 past the limit)", async () => {
    const app = await buildApp();
    const owner = await tokenFor(app, "hh-cap@zeno.test");
    for (let i = 0; i < 5; i += 1) {
      const ok = await app.inject({
        method: "POST",
        url: "/api/v1/family/create",
        headers: authH(owner.token),
        payload: { ownerName: `H${i}` }
      });
      expect(ok.statusCode).toBe(200);
    }
    const overflow = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(owner.token),
      payload: { ownerName: "H6" }
    });
    expect(overflow.statusCode).toBe(409);
    expect(overflow.json().error.code).toBe("CONFLICT");
  });

  it("rejects a sync push whose vectorClock value exceeds the magnitude cap", async () => {
    const app = await buildApp();
    const { token } = await tokenFor(app, "vc-cap@zeno.test");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sync/push",
      headers: authH(token),
      payload: {
        encryptedChanges: [{
          entityType: "subscription",
          entityId: "s1",
          operation: "update",
          encryptedPayload: "cipher",
          vectorClock: { deviceA: Number.MAX_SAFE_INTEGER }
        }]
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("BAD_REQUEST");
  });

  it("forbids reading a household you do not belong to (403), and 401 without a token", async () => {
    const app = await buildApp();
    const a = await tokenFor(app, "hh-a@zeno.test");
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(a.token),
      payload: { ownerName: "A" }
    });
    const householdId = created.json().data.household.id as string;

    // Owner can read it.
    const ownerRead = await app.inject({ method: "GET", url: `/api/v1/family/${householdId}`, headers: authH(a.token) });
    expect(ownerRead.statusCode).toBe(200);

    // A different logged-in user passing someone else's household id → 403.
    const b = await tokenFor(app, "hh-b@zeno.test");
    const denied = await app.inject({ method: "GET", url: `/api/v1/family/${householdId}`, headers: authH(b.token) });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe("FORBIDDEN");

    // No token at all → 401.
    const noToken = await app.inject({ method: "GET", url: `/api/v1/family/${householdId}` });
    expect(noToken.statusCode).toBe(401);
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
      const { token } = await tokenFor(app, "coach@zeno.test");
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/coach",
        headers: authH(token),
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
    const { token } = await tokenFor(app, "coach2@zeno.test");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/coach",
      headers: authH(token),
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

  it("protects Plaid and never accepts an access token from the client", async () => {
    const app = await buildApp();
    // No token → guarded.
    expect((await app.inject({ method: "POST", url: "/api/v1/plaid/transactions" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/api/v1/plaid/exchange", payload: { publicToken: "x" } })).statusCode).toBe(401);

    // With a token but Plaid unconfigured in tests → 503 (not 400/200). Proves the
    // request passes auth and there's no client-supplied access_token path anymore.
    const { token } = await tokenFor(app, "plaid@zeno.test");
    const tx = await app.inject({ method: "POST", url: "/api/v1/plaid/transactions", headers: authH(token) });
    expect(tx.statusCode).toBe(503);
    const ex = await app.inject({ method: "POST", url: "/api/v1/plaid/exchange", headers: authH(token), payload: { publicToken: "x" } });
    expect(ex.statusCode).toBe(503);
  });

  it("account deletion purges every kv_store namespace and revokes sessions", async () => {
    const app = await buildApp();
    const { token, accountId, refreshToken } = await tokenFor(app, "delete-me@zeno.test");

    // Seed billing (entitlement cache).
    applyWebhookEvent({
      event: { app_user_id: accountId, type: "INITIAL_PURCHASE", entitlement_ids: ["pro"], expiration_at_ms: Date.now() + 100_000 }
    });
    expect(getCachedEntitlement(accountId)).toBeDefined();

    // Seed Plaid (in-memory item; encryption isn't configured in tests so this
    // stays in-memory-only, which is enough to prove the in-memory purge).
    storePlaidItem(accountId, { accessToken: "sandbox-token", itemId: "item-1" });
    expect(getStoredPlaidItem(accountId)).toBeDefined();

    // Seed sync (an encrypted change the server can't read, just opaque ciphertext).
    await app.inject({
      method: "POST",
      url: "/api/v1/sync/push",
      headers: authH(token),
      payload: { encryptedChanges: [{ entityType: "subscription", entityId: "sub-1", operation: "create", encryptedPayload: "cipher", vectorClock: { device: 1 } }] }
    });
    const pullBefore = await app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: authH(token) });
    expect(pullBefore.json().data.encryptedChanges).toHaveLength(1);

    // Seed family (this account is the sole member → household exists).
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/family/create",
      headers: authH(token),
      payload: { ownerName: "Deletable Owner" }
    });
    const householdId = created.json().data.household.id as string;
    expect((await app.inject({ method: "GET", url: `/api/v1/family/${householdId}`, headers: authH(token) })).statusCode).toBe(200);

    // Delete the account.
    const deleted = await app.inject({ method: "DELETE", url: "/api/v1/account", headers: authH(token) });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().data.deleted).toBe(true);

    // Billing + Plaid purged in-memory.
    expect(getCachedEntitlement(accountId)).toBeUndefined();
    expect(getStoredPlaidItem(accountId)).toBeUndefined();

    // Sync data gone — even though the short-lived access token still verifies
    // (stateless JWT, no revocation list), there is simply nothing left to pull.
    const pullAfter = await app.inject({ method: "GET", url: "/api/v1/sync/pull", headers: authH(token) });
    expect(pullAfter.json().data.encryptedChanges).toEqual([]);

    // Household disbanded (this account was the sole member).
    expect((await app.inject({ method: "GET", url: `/api/v1/family/${householdId}`, headers: authH(token) })).statusCode).toBe(404);

    // The refresh session is revoked immediately — old refresh token rejected.
    const refreshAttempt = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", payload: { refreshToken } });
    expect(refreshAttempt.statusCode).toBe(401);
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
