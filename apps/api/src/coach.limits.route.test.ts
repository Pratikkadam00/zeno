import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * F247 through the route: POST /api/v1/coach with Claude configured and the
 * SDK faked. What a capped coach answers (429, and the app shows its own
 * insights), and that asking again with nothing changed costs nothing.
 */
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create } };
  })
}));

const { buildApp } = await import("./app");
const { clearCoachAnswers, resetCoachClient } = await import("./coach");
const { clearCoachLedger } = await import("./coach-budget");

const ENV = ["COACH_PROVIDER", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "AI_COACH_MODEL", "COACH_ACCOUNT_DAILY_REQUESTS", "COACH_MONTHLY_BUDGET_USD"] as const;
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  create.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify({ outOfScope: false, summary: "Netflix is your largest.", recommendations: [] }) }],
    stop_reason: "end_turn",
    usage: { input_tokens: 1200, output_tokens: 300 }
  });
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  clearCoachLedger();
  clearCoachAnswers();
  resetCoachClient();
  create.mockReset();
});

type App = Awaited<ReturnType<typeof buildApp>>;
async function tokenFor(app: App, email: string): Promise<string> {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const raw = decodeURIComponent((requested.json().data.devLink as string).split("token=")[1] ?? "");
  const verified = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: raw } });
  return verified.json().data.accessToken as string;
}

const body = (total: number) => ({ totalMonthlyMinor: total, subscriptions: [{ name: "Netflix", category: "entertainment", monthlyMinor: total, billingCycle: "monthly" }] });

describe("POST /api/v1/coach with Claude: caps and the answer cache", () => {
  it("the same request again within a day is answered from memory: one call to Claude, the same answer twice", async () => {
    const app = await buildApp();
    const headers = { authorization: `Bearer ${await tokenFor(app, "cache@zeno.test")}` };
    const first = await app.inject({ method: "POST", url: "/api/v1/coach", headers, payload: body(1549) });
    const second = await app.inject({ method: "POST", url: "/api/v1/coach", headers, payload: body(1549) });
    expect(first.statusCode).toBe(200);
    expect(second.json().data).toEqual(first.json().data);
    expect(create).toHaveBeenCalledTimes(1);
    // A changed request is a new question.
    await app.inject({ method: "POST", url: "/api/v1/coach", headers, payload: body(1599) });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("past the account's daily answers, the coach says 429 and Claude is not called", async () => {
    process.env.COACH_ACCOUNT_DAILY_REQUESTS = "1";
    const app = await buildApp();
    const headers = { authorization: `Bearer ${await tokenFor(app, "capped@zeno.test")}` };
    expect((await app.inject({ method: "POST", url: "/api/v1/coach", headers, payload: body(1549) })).statusCode).toBe(200);
    const capped = await app.inject({ method: "POST", url: "/api/v1/coach", headers, payload: body(1599) });
    expect(capped.statusCode).toBe(429);
    expect(capped.json().error).toEqual({ code: "RATE_LIMITED", message: "The AI coach has reached its limit for now. Your on-device insights are still here." });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("the month's budget spent: every account gets 429, and the reason is not told to the caller", async () => {
    process.env.COACH_MONTHLY_BUDGET_USD = "0";
    const app = await buildApp();
    const headers = { authorization: `Bearer ${await tokenFor(app, "broke@zeno.test")}` };
    const r = await app.inject({ method: "POST", url: "/api/v1/coach", headers, payload: body(1549) });
    expect(r.statusCode).toBe(429);
    expect(JSON.stringify(r.json())).not.toMatch(/monthly|budget_usd|\$/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("an answer the guard replaces is still a 200, carrying the redirect", async () => {
    create.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ outOfScope: false, summary: "Sure:\ndef scrape(url):\n    pass", recommendations: [] }) }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1200, output_tokens: 300 }
    });
    const app = await buildApp();
    const headers = { authorization: `Bearer ${await tokenFor(app, "guard@zeno.test")}` };
    const r = await app.inject({ method: "POST", url: "/api/v1/coach", headers, payload: body(1549) });
    expect(r.statusCode).toBe(200);
    expect(r.json().data).toMatchObject({ outOfScope: true, recommendations: [] });
    expect(r.json().data.summary).not.toContain("def ");
  });
});
