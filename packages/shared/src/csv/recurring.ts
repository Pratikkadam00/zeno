import type { BillingCycle, Money, SubscriptionCategory } from "../domain";
import { normalizeMerchant, parseAmountMinor, parseCsvRows } from "./parse-utils";

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

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
const QUARTER_MS = MONTH_MS * 3;
const YEAR_MS = 1000 * 60 * 60 * 24 * 365;

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows = parseCsvRows(text);
  const [header, ...body] = rows.filter((candidate) => candidate.some((cell) => cell.trim().length > 0));
  if (!header) {
    return [];
  }

  // De-duplicate header keys so repeated column names don't silently overwrite
  // one another (Object.fromEntries keeps only the last value for a duplicate
  // key). Repeats are suffixed (e.g. "amount", "amount_2") so every column is
  // preserved.
  const keys = dedupeHeaderKeys(header.map((key) => key.trim()));

  return body.map((cells) => Object.fromEntries(keys.map((key, index) => [key, cells[index]?.trim() ?? ""])));
}

function dedupeHeaderKeys(keys: string[]): string[] {
  const seen = new Map<string, number>();
  return keys.map((key) => {
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? key : `${key}_${count + 1}`;
  });
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

    const postedAt = parseDateUtc(date);
    if (!postedAt) {
      // Skip rows whose date can't be parsed rather than throwing (a single bad
      // row should not abort the whole import).
      return [];
    }

    return [{
      postedAt,
      merchant,
      amountMinor: Math.abs(amount),
      currency,
      raw: row
    }];
  });
}

// Parse a bank-statement date into a UTC ISO string, or null if unparseable.
//
// Dates are interpreted in UTC so the local timezone can never shift the calendar
// day (e.g. `new Date("2026-01-02")` is already UTC midnight, but
// `new Date("2026/01/02")` is parsed in the local tz and can roll back a day).
//
// Ambiguous slash dates are interpreted as US-style MM/DD/YYYY. This is the one
// documented convention; DD/MM/YYYY ("EU") inputs are not auto-detected.
function parseDateUtc(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // ISO-8601 (YYYY-MM-DD, optionally with a time). Date.parse treats the
  // date-only form as UTC, so it is timezone-stable as-is.
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(trimmed);
  if (iso) {
    return finalizeUtcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // Slash dates: documented as US-style MM/DD/YYYY (or MM/DD/YY).
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    let year = Number(slash[3]);
    if ((slash[3] ?? "").length === 2) {
      year += year < 70 ? 2000 : 1900;
    }
    return finalizeUtcDate(year, month, day);
  }

  return null;
}

function finalizeUtcDate(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject overflow (e.g. 02/30 -> Mar 2) so impossible dates aren't silently shifted.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString();
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

function findDominantAmountCluster(transactions: CsvTransaction[]): CsvTransaction[] {
  if (transactions.length === 0) {
    return [];
  }

  // Sort by amount so a cluster is a contiguous run. Each candidate reference
  // opens a window of FIXED width measured from that single reference; members
  // must fall within that one window. Because every member is compared to the
  // same reference (not to its neighbour), the cluster can never span more than
  // the tolerance — so two charges that are each "close" to an intermediate
  // amount but far from each other cannot be merged. This makes clustering
  // transitive and bounded, unlike a per-pair/per-anchor relative tolerance.
  const sorted = [...transactions].sort((a, b) => a.amountMinor - b.amountMinor);
  let best: CsvTransaction[] = [];

  for (let start = 0; start < sorted.length; start += 1) {
    const reference = sorted[start];
    if (!reference) {
      continue;
    }
    const tolerance = amountTolerance(reference.amountMinor);
    const cluster: CsvTransaction[] = [];
    for (let i = start; i < sorted.length; i += 1) {
      const item = sorted[i];
      if (!item || item.amountMinor - reference.amountMinor > tolerance) {
        break;
      }
      cluster.push(item);
    }
    if (cluster.length > best.length) {
      best = cluster;
    }
  }

  // Return members in chronological order: callers (cadence inference, next-date
  // projection) rely on the cluster being date-sorted, and we clustered over an
  // amount-sorted copy above.
  return [...best].sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt));
}

// Stable tolerance for a single reference amount: an absolute floor (one dollar)
// or a fixed 5% relative band, whichever is larger.
function amountTolerance(referenceMinor: number): number {
  return Math.max(Math.round(referenceMinor * 0.05), 100);
}

function inferCadence(transactions: CsvTransaction[]): "weekly" | "monthly" | "quarterly" | "annual" | "unknown" {
  const intervals = transactions
    .slice(1)
    .map((item, index) => Date.parse(item.postedAt) - Date.parse(transactions[index]?.postedAt ?? item.postedAt));

  if (intervals.length === 0) {
    return "unknown";
  }

  // Use the MEDIAN interval, not the average: a single irregular gap (a missed
  // or doubled charge) skews the mean enough to misclassify an otherwise regular
  // cadence, whereas the median is robust to such outliers.
  const typical = median(intervals);
  if (typical >= WEEK_MS * 0.6 && typical <= WEEK_MS * 1.4) {
    return "weekly";
  }
  if (typical >= MONTH_MS * 0.75 && typical <= MONTH_MS * 1.35) {
    return "monthly";
  }
  if (typical >= QUARTER_MS * 0.85 && typical <= QUARTER_MS * 1.15) {
    return "quarterly";
  }
  if (typical >= YEAR_MS * 0.85 && typical <= YEAR_MS * 1.15) {
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
  const start = new Date(date);
  if (cadence === "weekly") {
    return new Date(start.getTime() + WEEK_MS).toISOString();
  }
  if (cadence === "monthly") {
    return addMonthsClamped(start, 1).toISOString();
  }
  if (cadence === "quarterly") {
    return addMonthsClamped(start, 3).toISOString();
  }
  if (cadence === "annual") {
    return addMonthsClamped(start, 12).toISOString();
  }
  return undefined;
}

function addMonthsClamped(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const daysInTargetMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, daysInTargetMonth));
  return next;
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
