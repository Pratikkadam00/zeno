import Anthropic from "@anthropic-ai/sdk";

// AI spend coach. Supports two providers; the active one is chosen by env:
//
//   COACH_PROVIDER=anthropic  → Claude via the official SDK (ANTHROPIC_API_KEY)
//   COACH_PROVIDER=groq       → Groq's OpenAI-compatible API (GROQ_API_KEY), free
//
// If COACH_PROVIDER is unset it auto-selects: Anthropic when ANTHROPIC_API_KEY is
// present, else Groq when GROQ_API_KEY is present, else "unconfigured" (the route
// then reports unconfigured and the mobile client falls back to on-device
// rule-based insights). Same "build behind env key + graceful fallback" pattern
// as billing / sync / plaid.
//
// Model is configurable via AI_COACH_MODEL (must match the active provider).
// Any OpenAI-compatible endpoint (Groq, OpenRouter, Together, a local server)
// works via COACH_PROVIDER=groq + COACH_BASE_URL.
const ANTHROPIC_DEFAULT_MODEL = "claude-opus-4-8";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

export type Provider = "anthropic" | "groq";

export type CoachSubscription = {
  name: string;
  category: string;
  monthlyMinor: number;
  billingCycle: string;
};

export type CoachInsight = {
  title: string;
  body: string;
};

export type CoachRequest = {
  totalMonthlyMinor: number;
  currency?: string | undefined;
  subscriptions: CoachSubscription[];
  insights?: CoachInsight[] | undefined;
  question?: string | undefined;
};

export type CoachRecommendation = {
  title: string;
  detail: string;
  estimatedMonthlySavingsLabel?: string;
};

export type CoachResult = {
  source: "ai";
  provider: Provider;
  model: string;
  summary: string;
  recommendations: CoachRecommendation[];
};

// Resolves the active provider, or null when nothing is configured.
export function resolveProvider(): Provider | null {
  const explicit = process.env.COACH_PROVIDER?.trim().toLowerCase();
  if (explicit === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (explicit === "groq") return process.env.GROQ_API_KEY ? "groq" : null;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GROQ_API_KEY) return "groq";
  return null;
}

export function coachConfigured(): boolean {
  return resolveProvider() !== null;
}

export function coachModel(): string {
  if (process.env.AI_COACH_MODEL) return process.env.AI_COACH_MODEL;
  return resolveProvider() === "groq" ? GROQ_DEFAULT_MODEL : ANTHROPIC_DEFAULT_MODEL;
}

const SYSTEM_PROMPT = [
  "You are Zeno's spend coach. You help a single user spend less on recurring subscriptions.",
  "Given their monthly subscription totals, per-service breakdown, and deterministic insights already surfaced in-app, write a short, concrete coaching plan.",
  "Be specific and actionable: name the subscriptions, suggest switching to annual billing, consolidating overlapping tools, or cancelling low-value ones when the data supports it.",
  "Do not invent subscriptions or numbers that are not in the input. Keep each recommendation to one or two sentences. Provide 2-5 recommendations, highest-impact first.",
  "This is general budgeting guidance, not personalized financial or investment advice.",
  "Respond with ONLY a JSON object, no markdown fences, in exactly this shape:",
  '{"summary": string, "recommendations": [{"title": string, "detail": string, "estimatedMonthlySavingsLabel"?: string}]}'
].join(" ");

function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `$${(minor / 100).toFixed(2)}`;
  }
}

function buildUserPrompt(input: CoachRequest): string {
  const currency = input.currency ?? "USD";
  const lines: string[] = [];
  lines.push(`Total estimated monthly subscription spend: ${formatMoney(input.totalMonthlyMinor, currency)}.`);
  lines.push("");
  lines.push("Active subscriptions:");
  for (const sub of input.subscriptions) {
    lines.push(`- ${sub.name} (${sub.category}, ${sub.billingCycle}): ${formatMoney(sub.monthlyMinor, currency)}/mo`);
  }
  if (input.insights && input.insights.length > 0) {
    lines.push("");
    lines.push("Insights already shown in-app:");
    for (const insight of input.insights) {
      lines.push(`- ${insight.title}: ${insight.body}`);
    }
  }
  if (input.question && input.question.trim()) {
    lines.push("");
    lines.push(`The user asks: ${input.question.trim()}`);
  }
  lines.push("");
  lines.push("Respond with a one-sentence summary and a prioritized list of recommendations.");
  return lines.join("\n");
}

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

async function callAnthropic(model: string, userPrompt: string): Promise<string> {
  const response = await getAnthropicClient().messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  });
  return response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
}

// Groq (and any OpenAI-compatible endpoint) via the chat-completions shape.
async function callOpenAiCompatible(model: string, userPrompt: string): Promise<string> {
  const baseUrl = (process.env.COACH_BASE_URL ?? GROQ_DEFAULT_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI provider request failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function generateCoaching(input: CoachRequest): Promise<CoachResult> {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error("AI coach is not configured.");
  }
  const model = coachModel();
  const userPrompt = buildUserPrompt(input);
  const text = (provider === "anthropic"
    ? await callAnthropic(model, userPrompt)
    : await callOpenAiCompatible(model, userPrompt)).trim();

  const parsed = extractJson(text);

  return {
    source: "ai",
    provider,
    model,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
          .filter((rec): rec is CoachRecommendation => Boolean(rec) && typeof rec.title === "string" && typeof rec.detail === "string")
          .slice(0, 5)
      : []
  };
}

// The model is asked for raw JSON, but tolerate stray prose or ```json fences by
// parsing the outermost { … } slice.
function extractJson(text: string): { summary?: string; recommendations?: CoachRecommendation[] } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("AI coach returned no JSON.");
  }
  return JSON.parse(text.slice(start, end + 1)) as { summary?: string; recommendations?: CoachRecommendation[] };
}

// Reset the memoized client (tests toggle env between cases).
export function resetCoachClient(): void {
  anthropicClient = null;
}
