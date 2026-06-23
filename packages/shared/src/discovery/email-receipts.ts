import type { BillingCycle, CurrencyCode, SubscriptionCategory } from "../domain";

export type EmailReceiptCandidateInput = {
  provider: "gmail" | "outlook" | "apple_mail" | "yahoo" | "protonmail" | "imap";
  sender: string;
  subject: string;
  receivedAt: string;
  snippet?: string;
};

/** How a subscription is billed. "app_store"/"play_store" are the ones Rocket
 *  Money admits it can't see (the charge comes from Apple/Google, not the app). */
export type BilledThrough = "app_store" | "play_store" | "direct";

export type EmailReceiptCandidate = {
  merchant: string;
  amountMinor: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  category: SubscriptionCategory;
  sourceProvider: EmailReceiptCandidateInput["provider"];
  billedThrough: BilledThrough;
  receivedAt: string;
  confidence: number;
};

const billingWords = /\b(receipt|invoice|renewal|subscription|payment|charged|billing|your plan|order)\b/i;
const amountPattern = /(?:USD|US\$|\$)\s?([0-9]+(?:\.[0-9]{2})?)/i;
const annualPattern = /\b(annual|yearly|per year|\/year|1 year)\b/i;
const monthlyPattern = /\b(monthly|per month|\/month|renews every month|1 month)\b/i;

// Apple bills App Store subscriptions from these addresses; Google Play from its own.
const appleSenderPattern = /(@email\.apple\.com|@itunes\.com|@apple\.com|\bapp\s?store\b)/i;
const googleSenderPattern = /(googleplay-noreply@google\.com|\bgoogle\s?play\b)/i;

/** Whether a receipt is billed via the App Store / Play Store (Rocket Money's gap)
 *  or directly by the service. Pass any text that includes the sender. */
export function detectBilledThrough(haystack: string): BilledThrough {
  if (appleSenderPattern.test(haystack)) return "app_store";
  if (googleSenderPattern.test(haystack)) return "play_store";
  return "direct";
}

export function detectEmailReceiptCandidates(inputs: EmailReceiptCandidateInput[]): EmailReceiptCandidate[] {
  return inputs
    .flatMap((input) => {
      const haystack = `${input.sender} ${input.subject} ${input.snippet ?? ""}`;
      const billedThrough = detectBilledThrough(`${input.sender} ${input.subject}`);

      // App Store / Play Store mails are always billing receipts even when the
      // generic billing words are absent — that's exactly the coverage gap.
      if (billedThrough === "direct" && !billingWords.test(haystack)) {
        return [];
      }

      const amountMinor = extractAmountMinor(haystack);
      if (amountMinor === null) {
        return [];
      }

      const merchant = billedThrough === "direct"
        ? extractMerchant(input.sender, input.subject)
        : extractStoreAppName(`${input.subject} ${input.snippet ?? ""}`) ?? (billedThrough === "app_store" ? "App Store subscription" : "Play Store subscription");

      const candidate: EmailReceiptCandidate = {
        merchant,
        amountMinor,
        currency: "USD",
        billingCycle: annualPattern.test(haystack) ? "annual" : monthlyPattern.test(haystack) ? "monthly" : "unknown",
        category: suggestCategory(`${merchant} ${haystack}`),
        sourceProvider: input.provider,
        billedThrough,
        receivedAt: input.receivedAt,
        confidence: scoreReceipt(haystack, billedThrough, merchant)
      };

      return [candidate];
    })
    .sort((a, b) => b.confidence - a.confidence);
}

function extractAmountMinor(value: string): number | null {
  const match = value.match(amountPattern);
  if (!match?.[1]) {
    return null;
  }
  return Math.round(Number.parseFloat(match[1]) * 100);
}

function extractMerchant(sender: string, subject: string): string {
  const senderName = sender.split("<")[0]?.trim();
  if (senderName) {
    return cleanupMerchant(senderName);
  }

  const subjectLead = subject.split(/receipt|invoice|renewal|payment/i)[0]?.trim();
  return cleanupMerchant(subjectLead || "Unknown merchant");
}

// Receipt/biller noise that can precede the real app name in a flattened receipt.
const noiseLeadPattern = /^(?:your|the|from|for|receipt|invoice|apple|app\s?store|google\s?play|order|item|renewal|auto[- ]?renew(?:able|ing)?)(?:\s+|$)/i;
const appWord = "[A-Za-z0-9][\\w+&.\\-]*";

function cleanStoreApp(value: string): string {
  let result = value.replace(/["'’]/g, "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 6; i++) {
    const next = result.replace(noiseLeadPattern, "").trim();
    if (next === result) break;
    result = next;
  }
  return result;
}

/** Pull the real app/service name out of an App Store / Play Store receipt — the
 *  biller is Apple/Google, but the subscription is e.g. "Disney+" or "Duolingo". */
export function extractStoreAppName(text: string): string | null {
  // 1) up to 3 words immediately before a "(Monthly)" / "(1 Year)" period marker
  const period = text.match(new RegExp(`(${appWord}(?:\\s+${appWord}){0,2})\\s*\\((?:1\\s*month|monthly|1\\s*year|annual|yearly|auto[- ]?renewable)\\)`, "i"));
  const fromPeriod = period?.[1] ? cleanStoreApp(period[1]) : "";
  if (fromPeriod.length >= 2) return fromPeriod;
  // 2) 1-2 words right before "subscription"/"membership"
  const before = text.match(new RegExp(`(${appWord}(?:\\s+${appWord}){0,1})\\s+(?:subscription|membership)\\b`, "i"));
  const fromBefore = before?.[1] ? cleanStoreApp(before[1]) : "";
  if (fromBefore.length >= 2) return fromBefore;
  // 3) "receipt for X" / "subscription to X" / "renewal for X"
  const after = text.match(new RegExp(`(?:receipt for|subscription to|renewal for)\\s+(${appWord}(?:\\s+${appWord}){0,2})`, "i"));
  const fromAfter = after?.[1] ? cleanStoreApp(after[1]) : "";
  if (fromAfter.length >= 2) return fromAfter;
  return null;
}

function cleanupMerchant(value: string): string {
  return value
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreReceipt(value: string, billedThrough: BilledThrough, merchant: string): number {
  let score = 0.45;
  if (/receipt|invoice/i.test(value)) {
    score += 0.2;
  }
  if (/subscription|renewal|billing/i.test(value)) {
    score += 0.2;
  }
  if (monthlyPattern.test(value) || annualPattern.test(value)) {
    score += 0.15;
  }
  // A store receipt whose app name we resolved is a high-confidence subscription;
  // a store receipt we couldn't name is still worth surfacing, just lower.
  if (billedThrough !== "direct") {
    const named = merchant !== "App Store subscription" && merchant !== "Play Store subscription";
    score = Math.max(score, named ? 0.78 : 0.55);
  }
  return Math.min(1, Number(score.toFixed(2)));
}

function suggestCategory(value: string): SubscriptionCategory {
  const lower = value.toLowerCase();
  if (/(openai|chatgpt|claude|anthropic|midjourney|runway|perplexity|elevenlabs|cursor|copilot)/.test(lower)) {
    return "ai_tools";
  }
  if (/(netflix|spotify|hulu|youtube|audible|disney|patreon|max|twitch|hbo)/.test(lower)) {
    return "entertainment";
  }
  if (/(notion|figma|linear|slack|zoom|dropbox|canva|adobe|grammarly|loom)/.test(lower)) {
    return "productivity";
  }
  if (/(headspace|calm|duolingo|fitbod|strava|peloton|myfitnesspal)/.test(lower)) {
    return "health";
  }
  return "other";
}
