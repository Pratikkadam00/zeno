import Anthropic from "@anthropic-ai/sdk";

// AI spend coach. Live when ANTHROPIC_API_KEY is set; otherwise the route
// reports "unconfigured" and the mobile client falls back to the deterministic
// rule-based insights it already computes locally. Same "build behind env key +
// graceful fallback" pattern as billing / sync / plaid.
//
// Model is configurable so a free Anthropic trial can be stretched with a
// cheaper model:  AI_COACH_MODEL=claude-haiku-4-5  (default: claude-opus-4-8).
const DEFAULT_MODEL = "claude-opus-4-8";

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
  model: string;
  summary: string;
  recommendations: CoachRecommendation[];
};

export function coachConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function coachModel(): string {
  return process.env.AI_COACH_MODEL ?? DEFAULT_MODEL;
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

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function generateCoaching(input: CoachRequest): Promise<CoachResult> {
  const model = coachModel();
  const response = await getClient().messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }]
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  const parsed = extractJson(text);

  return {
    source: "ai",
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
  client = null;
}
