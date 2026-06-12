import type { BillingCycle, Money, SubscriptionCategory } from "../domain";

export type CsvTransaction = {
  postedAt: string;
  merchant: string;
  amountMinor: number;
  currency: Money["currency"];
  raw: Record<string, string>;
};

export type RecurringChargeCandidate = {
  merchant: string;
  normalizedMerchant: string;
  amount: Money;
  billingCycle: BillingCycle;
  occurrences: CsvTransaction[];
  confidence: number;
  suggestedCategory: SubscriptionCategory;
  nextRenewalDate?: string;
};

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
const YEAR_MS = 1000 * 60 * 60 * 24 * 365;

export function normalizeMerchant(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|com|payment|purchase|recurring|subscription)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      i += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char ?? "";
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((candidate) => candidate.some((cell) => cell.trim().length > 0));
  if (!header) {
    return [];
  }

  return body.map((cells) => Object.fromEntries(header.map((key, index) => [key.trim(), cells[index]?.trim() ?? ""])));
}

export function mapBankRows(rows: Array<Record<string, string>>, currency: Money["currency"] = "USD"): CsvTransaction[] {
  return rows.flatMap((row) => {
    const date = firstValue(row, ["date", "posted date", "transaction date", "posting date"]);
    const merchant = firstValue(row, ["merchant", "description", "name", "payee"]);
    const amountText = firstValue(row, ["amount", "debit", "charge", "transaction amount"]);
    const amount = parseAmountMinor(amountText);

    if (!date || !merchant || amount === null) {
      return [];
    }

    return [{
      postedAt: new Date(date).toISOString(),
      merchant,
      amountMinor: Math.abs(amount),
      currency,
      raw: row
    }];
  });
}

export function detectRecurringCharges(transactions: CsvTransaction[]): RecurringChargeCandidate[] {
  const groups = new Map<string, CsvTransaction[]>();

  for (const transaction of transactions) {
    const key = normalizeMerchant(transaction.merchant);
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }

  const candidates: RecurringChargeCandidate[] = [];

  for (const [normalizedMerchant, group] of groups) {
    const sorted = [...group].sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt));
    if (sorted.length < 2) {
      continue;
    }

    const amountCluster = findDominantAmountCluster(sorted);
    if (amountCluster.length < 2) {
      continue;
    }

    const cadence = inferCadence(amountCluster);
    if (cadence === "unknown") {
      continue;
    }

    const confidence = scoreCandidate(amountCluster, cadence);
    const last = amountCluster[amountCluster.length - 1];
    const nextRenewalDate = last ? projectNextDate(last.postedAt, cadence) : undefined;

    const candidate: RecurringChargeCandidate = {
      merchant: bestMerchantName(amountCluster),
      normalizedMerchant,
      amount: {
        amountMinor: median(amountCluster.map((item) => item.amountMinor)),
        currency: amountCluster[0]?.currency ?? "USD"
      },
      billingCycle: cadence,
      occurrences: amountCluster,
      confidence,
      suggestedCategory: suggestCategory(normalizedMerchant)
    };

    if (nextRenewalDate) {
      candidate.nextRenewalDate = nextRenewalDate;
    }

    candidates.push(candidate);
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

function firstValue(row: Record<string, string>, keys: string[]): string | undefined {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]));
  return keys.map((key) => normalized.get(key)).find((value): value is string => Boolean(value && value.trim().length > 0));
}

function parseAmountMinor(input: string | undefined): number | null {
  if (!input) {
    return null;
  }
  const cleaned = input.replace(/[$,\s]/g, "").replace(/[()]/g, "-");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    return null;
  }
  return Math.round(value * 100);
}

function findDominantAmountCluster(transactions: CsvTransaction[]): CsvTransaction[] {
  let best: CsvTransaction[] = [];

  for (const transaction of transactions) {
    const tolerance = Math.max(Math.round(transaction.amountMinor * 0.05), 100);
    const cluster = transactions.filter((candidate) => Math.abs(candidate.amountMinor - transaction.amountMinor) <= tolerance);
    if (cluster.length > best.length) {
      best = cluster;
    }
  }

  return best;
}

function inferCadence(transactions: CsvTransaction[]): "monthly" | "annual" | "unknown" {
  const intervals = transactions
    .slice(1)
    .map((item, index) => Date.parse(item.postedAt) - Date.parse(transactions[index]?.postedAt ?? item.postedAt));

  if (intervals.length === 0) {
    return "unknown";
  }

  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  if (average >= MONTH_MS * 0.75 && average <= MONTH_MS * 1.35) {
    return "monthly";
  }
  if (average >= YEAR_MS * 0.85 && average <= YEAR_MS * 1.15) {
    return "annual";
  }
  return "unknown";
}

function scoreCandidate(transactions: CsvTransaction[], cadence: BillingCycle): number {
  const cadenceWeight = cadence === "monthly" ? 0.4 : 0.3;
  const occurrenceWeight = Math.min(transactions.length / 6, 1) * 0.4;
  const amountSpread = Math.max(...transactions.map((item) => item.amountMinor)) - Math.min(...transactions.map((item) => item.amountMinor));
  const amountWeight = amountSpread <= Math.max(transactions[0]?.amountMinor ?? 0, 1) * 0.05 ? 0.2 : 0.1;
  return Number((cadenceWeight + occurrenceWeight + amountWeight).toFixed(2));
}

function projectNextDate(date: string, cadence: BillingCycle): string | undefined {
  const next = new Date(date);
  if (cadence === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (cadence === "annual") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    return undefined;
  }
  return next.toISOString();
}

function bestMerchantName(transactions: CsvTransaction[]): string {
  return transactions.sort((a, b) => b.merchant.length - a.merchant.length)[0]?.merchant ?? "Unknown";
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2)
    : sorted[middle] ?? 0;
}

function suggestCategory(normalizedMerchant: string): SubscriptionCategory {
  if (/(openai|anthropic|midjourney|perplexity|runway|elevenlabs|cursor|copilot)/.test(normalizedMerchant)) {
    return "ai_tools";
  }
  if (/(netflix|spotify|hulu|disney|audible|patreon|youtube|twitch|max)/.test(normalizedMerchant)) {
    return "entertainment";
  }
  if (/(notion|figma|linear|slack|zoom|dropbox|canva|loom|grammarly|adobe)/.test(normalizedMerchant)) {
    return "productivity";
  }
  return "other";
}
