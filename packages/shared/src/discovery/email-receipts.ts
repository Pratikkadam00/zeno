import type { BillingCycle, CurrencyCode, SubscriptionCategory } from "../domain";

export type EmailReceiptCandidateInput = {
  provider: "gmail" | "outlook" | "apple_mail" | "yahoo" | "protonmail" | "imap";
  sender: string;
  subject: string;
  receivedAt: string;
  snippet?: string;
};

export type EmailReceiptCandidate = {
  merchant: string;
  amountMinor: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  category: SubscriptionCategory;
  sourceProvider: EmailReceiptCandidateInput["provider"];
  receivedAt: string;
  confidence: number;
};

const billingWords = /\b(receipt|invoice|renewal|subscription|payment|charged|billing|your plan)\b/i;
const amountPattern = /(?:USD|\$)\s?([0-9]+(?:\.[0-9]{2})?)/i;
const annualPattern = /\b(annual|yearly|per year|\/year)\b/i;
const monthlyPattern = /\b(monthly|per month|\/month|renews every month)\b/i;

export function detectEmailReceiptCandidates(inputs: EmailReceiptCandidateInput[]): EmailReceiptCandidate[] {
  return inputs.flatMap((input) => {
    const haystack = `${input.sender} ${input.subject} ${input.snippet ?? ""}`;
    if (!billingWords.test(haystack)) {
      return [];
    }

    const amountMinor = extractAmountMinor(haystack);
    if (amountMinor === null) {
      return [];
    }

    const merchant = extractMerchant(input.sender, input.subject);
    const candidate: EmailReceiptCandidate = {
      merchant,
      amountMinor,
      currency: "USD",
      billingCycle: annualPattern.test(haystack) ? "annual" : monthlyPattern.test(haystack) ? "monthly" : "unknown",
      category: suggestCategory(haystack),
      sourceProvider: input.provider,
      receivedAt: input.receivedAt,
      confidence: scoreReceipt(haystack)
    };

    return [candidate];
  }).sort((a, b) => b.confidence - a.confidence);
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

function cleanupMerchant(value: string): string {
  return value
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreReceipt(value: string): number {
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
  return Math.min(1, Number(score.toFixed(2)));
}

function suggestCategory(value: string): SubscriptionCategory {
  const lower = value.toLowerCase();
  if (/(openai|chatgpt|claude|anthropic|midjourney|runway|perplexity|elevenlabs|cursor|copilot)/.test(lower)) {
    return "ai_tools";
  }
  if (/(netflix|spotify|hulu|youtube|audible|disney|patreon|max|twitch)/.test(lower)) {
    return "entertainment";
  }
  if (/(notion|figma|linear|slack|zoom|dropbox|canva|adobe|grammarly|loom)/.test(lower)) {
    return "productivity";
  }
  return "other";
}
