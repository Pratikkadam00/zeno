import type { Subscription, SubscriptionCategory } from "../domain";
import { monthlyAmount, monthlyAmountIn, type FxContext } from "./coach";
import { buildMonthlySpendHistory } from "./history";

export type YearInReview = {
  totalSpentMinor: number;           // actual cash out over the trailing 12 months
  projectedAnnualMinor: number;      // annualized current recurring spend
  activeCount: number;
  cancelledCount: number;
  mostExpensive: { name: string; monthlyMinor: number } | null;
  topCategory: { category: SubscriptionCategory; monthlyMinor: number } | null;
  busiestMonth: { label: string; amountMinor: number } | null;
  // First month the trailing-12-month total actually covers: the later of
  // (12 months before `now`) and the earliest subscription's createdAt. null
  // when there are no subscriptions. Lets the UI say "since you started
  // tracking in <label>" instead of overclaiming a full year for a new user.
  coverageStartLabel: string | null;
  // True only when tracking began on/before the window start — i.e. the total
  // genuinely spans the full trailing 12 months.
  coversFullTrailingYear: boolean;
  // Only meaningful when `fx` was passed — see SpendSummary.excludedCurrencyCount.
  excludedCurrencyCount?: number;
};

function coverageStart(subscriptions: Subscription[], now: Date): { label: string | null; coversFullTrailingYear: boolean } {
  // First day of the earliest month in the trailing-12-month window.
  const windowStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1);
  const stamps = subscriptions
    .map((s) => Date.parse(s.createdAt))
    .filter((n) => Number.isFinite(n));
  if (stamps.length === 0) {
    return { label: null, coversFullTrailingYear: false };
  }
  const earliest = Math.min(...stamps);
  const coversFullTrailingYear = earliest <= windowStart;
  const startStamp = Math.max(earliest, windowStart);
  const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(startStamp));
  return { label, coversFullTrailingYear };
}

/**
 * "Subscriptions Wrapped" — a year-in-review summary computed from real
 * subscription data: how much actually went out over the last 12 months, the
 * priciest sub, the category that ate the most, the most expensive month, and
 * how many were cancelled. Shareable retention moment.
 */
export function buildYearInReview(subscriptions: Subscription[], now: Date = new Date(), fx?: FxContext): YearInReview {
  const history = buildMonthlySpendHistory(subscriptions, 12, now, fx);
  const totalSpentMinor = history.reduce((sum, point) => sum + point.amountMinor, 0);

  const active = subscriptions.filter(
    (s) => s.status === "active" && s.billingCycle !== "trial" && s.billingCycle !== "unknown"
  );

  let mostExpensive: YearInReview["mostExpensive"] = null;
  const categoryTotals = new Map<SubscriptionCategory, number>();
  let excludedCurrencyCount = 0;
  let projectedAnnualMinor = 0;

  for (const subscription of active) {
    const monthly = fx ? monthlyAmountIn(subscription, fx.homeCurrency, fx.rates) : monthlyAmount(subscription);
    if (monthly === null) {
      excludedCurrencyCount += 1;
      continue;
    }
    projectedAnnualMinor += monthly * 12;
    if (!mostExpensive || monthly > mostExpensive.monthlyMinor) {
      mostExpensive = { name: subscription.name, monthlyMinor: monthly };
    }
    categoryTotals.set(subscription.category, (categoryTotals.get(subscription.category) ?? 0) + monthly);
  }

  let topCategory: YearInReview["topCategory"] = null;
  for (const [category, monthlyMinor] of categoryTotals) {
    if (!topCategory || monthlyMinor > topCategory.monthlyMinor) {
      topCategory = { category, monthlyMinor };
    }
  }

  let busiestMonth: YearInReview["busiestMonth"] = null;
  for (const point of history) {
    if (!busiestMonth || point.amountMinor > busiestMonth.amountMinor) {
      busiestMonth = { label: point.label, amountMinor: point.amountMinor };
    }
  }

  const coverage = coverageStart(subscriptions, now);

  const review: YearInReview = {
    totalSpentMinor,
    projectedAnnualMinor,
    activeCount: active.length,
    cancelledCount: subscriptions.filter((s) => s.status === "cancelled").length,
    mostExpensive,
    topCategory,
    busiestMonth,
    coverageStartLabel: coverage.label,
    coversFullTrailingYear: coverage.coversFullTrailingYear
  };

  if (fx) {
    review.excludedCurrencyCount = excludedCurrencyCount;
  }

  return review;
}
