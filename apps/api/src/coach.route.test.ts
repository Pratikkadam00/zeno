import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import { resetCoachClient } from "./coach";

/**
 * POST /api/v1/coach end to end: the route's schema + the real coach module,
 * with only the network faked. Pins what actually reaches the AI provider —
 * only the fields the schema allows — and that a request the schema rejects
 * never reaches the provider at all.
 */
const ENV_KEYS = ["COACH_PROVIDER", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "AI_COACH_MODEL", "COACH_BASE_URL", "RESEND_API_KEY", "MONITORING_WEBHOOK_URL"] as const;
const saved: Record<string, string | undefined> = {};

type App = Awaited<ReturnType<typeof buildApp>>;
let providerBodies: string[] = [];
let modelReply = JSON.stringify({ outOfScope: false, summary: "ok", recommendations: [] });

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env.COACH_PROVIDER = "groq";
  process.env.GROQ_API_KEY = "test-groq-key";
  providerBodies = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url !== "https://api.groq.com/openai/v1/chat/completions") throw new Error(`unexpected outbound request to ${url}`);
    providerBodies.push(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: modelReply } }] }), { status: 200 });
  });
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  resetCoachClient();
  vi.restoreAllMocks();
  modelReply = JSON.stringify({ outOfScope: false, summary: "ok", recommendations: [] });
});

async function tokenFor(app: App, email: string): Promise<string> {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email } });
  const devLink = requested.json().data.devLink as string;
  const raw = decodeURIComponent(devLink.split("token=")[1] ?? "");
  const verified = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}` });
  return verified.json().data.accessToken as string;
}

function userMessage(body: string): string {
  const parsed = JSON.parse(body) as { messages: { role: string; content: string }[] };
  return parsed.messages.find((m) => m.role === "user")!.content;
}

describe("POST /api/v1/coach → AI provider", () => {
  it("fields outside the schema are stripped before the provider sees anything", async () => {
    const app = await buildApp();
    const token = await tokenFor(app, "coach-e2e@zeno.test");
    const r = await app.inject({
      method: "POST",
      url: "/api/v1/coach",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        totalMonthlyMinor: 2500,
        currency: "CAD",
        userEmail: "jane@example.com",
        accountId: "acct_private_1",
        subscriptions: [{ name: "Netflix", category: "entertainment", monthlyMinor: 2500, billingCycle: "monthly", notes: "card 4242", email: "billing@example.com" }],
        insights: [{ title: "Tip", body: "Try annual", internalScore: 0.93 }],
        question: "What can I cut?"
      }
    });
    expect(r.statusCode).toBe(200);
    expect(providerBodies).toHaveLength(1);
    const body = providerBodies[0]!;
    for (const leaked of ["jane@example.com", "acct_private_1", "card 4242", "billing@example.com", "internalScore", "0.93", "coach-e2e@zeno.test"]) {
      expect(body, leaked).not.toContain(leaked);
    }
    const prompt = userMessage(body);
    expect(prompt).toContain("- Netflix (entertainment, monthly): CA$25.00/mo");
    expect(prompt).toContain("- Tip: Try annual");
    expect(prompt).toContain("What can I cut?");
  });

  it("a request the schema rejects (unknown currency, oversized field) never reaches the provider", async () => {
    const app = await buildApp();
    const token = await tokenFor(app, "coach-e2e-400@zeno.test");
    const base = { totalMonthlyMinor: 100, subscriptions: [{ name: "Netflix", category: "entertainment", monthlyMinor: 100, billingCycle: "monthly" }] };
    for (const payload of [
      { ...base, currency: "EURO" },
      { ...base, subscriptions: [{ ...base.subscriptions[0], name: "x".repeat(81) }] },
      { ...base, question: "q".repeat(501) }
    ]) {
      const r = await app.inject({ method: "POST", url: "/api/v1/coach", headers: { authorization: `Bearer ${token}` }, payload });
      expect(r.statusCode).toBe(400);
    }
    expect(providerBodies).toEqual([]);
  });

  it("the client receives only well-formed recommendations, whatever shape the model invents", async () => {
    modelReply = JSON.stringify({
      outOfScope: false,
      summary: "s",
      recommendations: [{ title: "Drop Hulu", detail: "Unused 3 months", estimatedMonthlySavingsLabel: { usd: 8 }, trackingPixel: "https://t.example/p.gif" }]
    });
    const app = await buildApp();
    const token = await tokenFor(app, "coach-e2e-shape@zeno.test");
    const r = await app.inject({ method: "POST", url: "/api/v1/coach", headers: { authorization: `Bearer ${token}` }, payload: { totalMonthlyMinor: 0, subscriptions: [] } });
    expect(r.statusCode).toBe(200);
    expect(r.json().data.recommendations).toEqual([{ title: "Drop Hulu", detail: "Unused 3 months" }]);
  });
});
