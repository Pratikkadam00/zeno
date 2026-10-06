import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { securityEvent } from "./security-events";
import { buildLoggerOptions } from "./server-options";

// ASVS V16.2.1, V16.3.1 to V16.3.3 (P7.2): every sign-in, refresh, sign-out and
// sign-in email, and every refused request, is a log line of its own naming the
// account (never the email), the method and the outcome. Run under the
// PRODUCTION logger options (info level), as start.ts builds them.

type Line = { msg?: string; time?: number; reqId?: string; security?: Record<string, unknown> };

async function appWithCapturedLogs() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(...String(chunk).split("\n").filter(Boolean));
      done();
    }
  });
  const app = await buildApp({ logger: { ...buildLoggerOptions({ NODE_ENV: "production" }), stream } });
  const events = () => lines.map((l) => JSON.parse(l) as Line).filter((l) => l.msg === "security event");
  return { app, lines, events };
}

describe("security events", () => {
  it("sign-in success and failure, refresh, sign-out, email request: each one line, with account, method and outcome", async () => {
    const { app, lines, events } = await appWithCapturedLogs();
    const email = "events-person@example.com";
    const sent = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: "192.0.2.40", payload: { email } });
    const token = decodeURIComponent((sent.json().data.devLink as string).split("token=")[1] ?? "");
    const wrong = await app.inject({ method: "POST", url: "/api/v1/auth/verify", remoteAddress: "192.0.2.41", payload: { token: "w".repeat(43) } });
    const signedIn = await app.inject({ method: "POST", url: "/api/v1/auth/verify", remoteAddress: "192.0.2.42", payload: { token } });
    const { accountId, refreshToken } = signedIn.json().data as { accountId: string; refreshToken: string };
    const refreshed = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", remoteAddress: "192.0.2.43", payload: { refreshToken } });
    await app.inject({ method: "POST", url: "/api/v1/auth/logout", remoteAddress: "192.0.2.44", payload: { refreshToken: refreshed.json().data.refreshToken } });
    await app.close();
    expect([wrong.statusCode, signedIn.statusCode, refreshed.statusCode]).toEqual([401, 200, 200]);

    expect(events().map((l) => l.security)).toEqual([
      { event: "auth.email_requested", outcome: "success", route: "/api/v1/auth/magic-link", status: 200 },
      { event: "auth.sign_in", method: "email_link_or_code", outcome: "failure", route: "/api/v1/auth/verify", status: 401 },
      { event: "auth.sign_in", method: "email_link_or_code", outcome: "success", route: "/api/v1/auth/verify", status: 200, account: accountId },
      { event: "auth.refresh", outcome: "success", route: "/api/v1/auth/refresh", status: 200, account: accountId },
      { event: "auth.sign_out", outcome: "success", route: "/api/v1/auth/logout", status: 200 }
    ]);
    // When (UTC epoch ms) and which request, on every one.
    for (const line of events()) {
      expect(line.time).toEqual(expect.any(Number));
      expect(line.reqId).toEqual(expect.any(String));
    }
    // Who is the pseudonymous account id, never the address.
    expect(lines.join("\n")).not.toContain(email);
  });

  it("refusals: no token (401), invalid input (400), too many requests (429), each with the account when known", async () => {
    const { app, events } = await appWithCapturedLogs();
    const sent = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: "192.0.2.50", payload: { email: "refusals@example.com" } });
    const token = decodeURIComponent((sent.json().data.devLink as string).split("token=")[1] ?? "");
    const session = (await app.inject({ method: "POST", url: "/api/v1/auth/verify", remoteAddress: "192.0.2.51", payload: { token } })).json().data as { accountId: string; accessToken: string };

    await app.inject({ method: "GET", url: "/api/v1/account", remoteAddress: "192.0.2.52" });
    await app.inject({ method: "POST", url: "/api/v1/family/join", remoteAddress: "192.0.2.53", headers: { authorization: `Bearer ${session.accessToken}` }, payload: { code: "" } });
    for (let i = 0; i < 7; i += 1) {
      await app.inject({ method: "POST", url: "/api/v1/auth/logout", remoteAddress: "192.0.2.54", payload: {} });
    }
    await app.close();

    const byEvent = (name: string) => events().map((l) => l.security!).filter((s) => s.event === name);
    expect(byEvent("access.unauthenticated")).toEqual([{ event: "access.unauthenticated", outcome: "failure", route: "/api/v1/account", status: 401 }]);
    expect(byEvent("input.refused")).toEqual([{ event: "input.refused", outcome: "failure", route: "/api/v1/family/join", status: 400, account: session.accountId }]);
    expect(byEvent("auth.sign_out").at(-1)).toEqual({ event: "auth.sign_out", outcome: "failure", route: "/api/v1/auth/logout", status: 429 });
  });

  // The audit trail (R31): each successful change to a user's data names the
  // account, and the household it touched.
  it("household create, spend change, leave and account deletion: one audit event each, with the account", async () => {
    const { app, events } = await appWithCapturedLogs();
    const sent = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: "192.0.2.60", payload: { email: "audit@example.com" } });
    const token = decodeURIComponent((sent.json().data.devLink as string).split("token=")[1] ?? "");
    const session = (await app.inject({ method: "POST", url: "/api/v1/auth/verify", remoteAddress: "192.0.2.61", payload: { token } })).json().data as { accountId: string; accessToken: string };
    const headers = { authorization: `Bearer ${session.accessToken}` };
    const created = await app.inject({ method: "POST", url: "/api/v1/family/create", remoteAddress: "192.0.2.62", headers, payload: { ownerName: "Asha", monthlySpendMinor: 4599, currency: "INR" } });
    const householdId = created.json().data.household.id as string;
    const spend = await app.inject({ method: "POST", url: `/api/v1/family/${householdId}/spend`, remoteAddress: "192.0.2.63", headers, payload: { monthlySpendMinor: 5000, currency: "INR" } });
    const left = await app.inject({ method: "POST", url: `/api/v1/family/${householdId}/leave`, remoteAddress: "192.0.2.64", headers });
    const deleted = await app.inject({ method: "DELETE", url: "/api/v1/account", remoteAddress: "192.0.2.65", headers });
    await app.close();
    expect([created.statusCode, spend.statusCode, left.statusCode, deleted.statusCode]).toEqual([200, 200, 200, 200]);

    const audit = events().map((l) => l.security!).filter((e) => String(e.event).startsWith("data."));
    const account = session.accountId;
    expect(audit).toEqual([
      { event: "data.household_created", outcome: "success", route: "/api/v1/family/create", status: 200, account },
      { event: "data.household_spend_changed", outcome: "success", route: "/api/v1/family/:householdId/spend", status: 200, account, household: householdId },
      { event: "data.household_left", outcome: "success", route: "/api/v1/family/:householdId/leave", status: 200, account, household: householdId },
      { event: "data.account_deleted", outcome: "success", route: "/api/v1/account", status: 200, account }
    ]);
  });

  it("a refused change is a refusal, not an audit entry; reading data makes none", () => {
    expect(securityEvent("/api/v1/family/:householdId/spend", 403, "acct_x", { httpMethod: "POST", householdId: "hh_1" })).toEqual({ event: "access.forbidden", outcome: "failure", route: "/api/v1/family/:householdId/spend", status: 403, account: "acct_x" });
    expect(securityEvent("/api/v1/family/:householdId", 200, "acct_x", { httpMethod: "GET", householdId: "hh_1" })).toBeNull();
    expect(securityEvent("/api/v1/account", 200, "acct_x", { httpMethod: "GET" })).toBeNull();
  });

  it("a request that is neither security-relevant nor refused makes no event", () => {
    expect(securityEvent("/api/v1/services", 200, undefined)).toBeNull();
    expect(securityEvent("/api/v1/account", 200, "acct_x")).toBeNull();
    expect(securityEvent("/api/v1/services/:slug", 404, undefined)).toBeNull();
    expect(securityEvent("/api/v1/family/:id", 403, "acct_x")).toEqual({ event: "access.forbidden", outcome: "failure", route: "/api/v1/family/:id", status: 403, account: "acct_x" });
  });
});
