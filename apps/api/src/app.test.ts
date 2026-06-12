import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

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

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/demo-login",
      payload: { email: "demo@zeno.local", password: "Zeno-Demo-2026!" }
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().data.tokenType).toBe("Bearer");

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const blocked = await app.inject({
        method: "POST",
        url: "/api/v1/auth/demo-login",
        payload: { email: "demo@zeno.local", password: "Zeno-Demo-2026!" }
      });
      expect(blocked.statusCode).toBe(404);
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("rejects unencrypted sync payloads by schema", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/sync/push",
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
});
