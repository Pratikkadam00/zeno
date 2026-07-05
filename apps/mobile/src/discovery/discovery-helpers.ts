import type { CurrencyCode } from "@zeno/shared";

export type DiscoveryBillingCycle = "monthly" | "quarterly" | "annual" | "weekly" | "unknown";

export type DiscoveryConfidence = "high" | "medium" | "low";

const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

// Detected/parsed currency strings (e.g. from emailScanner's detectCurrency)
// are loosely typed as `string`; narrow to the app's supported CurrencyCode
// union here rather than casting at every call site, falling back to USD for
// anything unrecognized instead of persisting a value the app can't format.
export function toCurrencyCode(value: string): CurrencyCode {
  const upper = value.toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper) ? (upper as CurrencyCode) : "USD";
}

export function calculateNextRenewal(lastCharged: Date, cycle: DiscoveryBillingCycle): Date {
  const next = new Date(lastCharged);
  if (cycle === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  const months = cycle === "annual" ? 12 : cycle === "quarterly" ? 3 : 1;
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, daysInTargetMonth));
  return next;
}

// Infer a billing cycle from the gaps (in days) between successive charges of
// the same service. Uses the median gap so one odd interval (a missed/duplicated
// receipt) doesn't skew it. Returns null when no known cadence matches, so the
// caller keeps its text-derived guess.
export function inferRecurringCycle(gaps: number[]): DiscoveryBillingCycle | null {
  if (gaps.length === 0) {
    return null;
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  if (median >= 5 && median <= 9) return "weekly";
  if (median >= 24 && median <= 35) return "monthly";
  if (median >= 85 && median <= 95) return "quarterly";
  if (median >= 350 && median <= 380) return "annual";
  return null;
}

export function confidenceRank(confidence: DiscoveryConfidence): number {
  if (confidence === "high") {
    return 3;
  }
  if (confidence === "medium") {
    return 2;
  }
  return 1;
}

export function isWithin(amount: number, expected: number, tolerance: number, minimumTolerance = 0): boolean {
  return Math.abs(amount - expected) <= Math.max(minimumTolerance, expected * tolerance);
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export type FreeCapDecision<T> = { toAdd: T[]; skipped: number };

// Free-tier cap for turning discovery results into tracked subscriptions. Never
// truncates what was FOUND (the caller shows every result); only limits how
// many become actively tracked in one batch, taking the first `remainingSlots`
// selected items in the order the user selected them. Pro/family pass
// remainingSlots = Infinity, so nothing is ever clamped for a paying user.
export function applyFreeCap<T>(selected: T[], remainingSlots: number): FreeCapDecision<T> {
  const toAdd = selected.slice(0, Math.max(0, remainingSlots));
  return { toAdd, skipped: selected.length - toAdd.length };
}

// Converts a detected item's raw amount (in its own billing cycle) to a yearly
// figure. "unknown" cadence contributes 0 — we won't fabricate a yearly
// commitment for a cycle we couldn't determine, mirroring how
// packages/shared's monthlyAmount treats trial/unknown cycles as non-recurring.
function annualizeDetectedAmount(amount: number, cycle: DiscoveryBillingCycle): number {
  if (cycle === "weekly") return amount * 52;
  if (cycle === "quarterly") return amount * 4;
  if (cycle === "monthly") return amount * 12;
  if (cycle === "annual") return amount;
  return 0;
}

export type FoundMoneyInput = { amount: number; currency: string; billingCycle: DiscoveryBillingCycle };
export type FoundMoneySummary = { annualTotal: number; currency: CurrencyCode; excludedCount: number };

// "Found money" total for a just-completed scan/import: the annualized sum in
// the batch's DOMINANT currency (the most common among the results). Never
// silently sums across currencies (the discovery-time analog of the Phase 1.5
// currency-honesty fix) — anything in a different currency is counted in
// excludedCount instead of folded into the total.
export function summarizeFoundMoney(items: FoundMoneyInput[]): FoundMoneySummary {
  const currencyCounts = new Map<CurrencyCode, number>();
  for (const item of items) {
    const code = toCurrencyCode(item.currency);
    currencyCounts.set(code, (currencyCounts.get(code) ?? 0) + 1);
  }

  let dominant: CurrencyCode = "USD";
  let dominantCount = 0;
  for (const [code, count] of currencyCounts) {
    if (count > dominantCount) {
      dominant = code;
      dominantCount = count;
    }
  }

  let annualTotal = 0;
  let excludedCount = 0;
  for (const item of items) {
    if (toCurrencyCode(item.currency) !== dominant) {
      excludedCount += 1;
      continue;
    }
    annualTotal += annualizeDetectedAmount(item.amount, item.billingCycle);
  }

  return { annualTotal, currency: dominant, excludedCount };
}
