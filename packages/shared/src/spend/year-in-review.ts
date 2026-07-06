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
  // Only meaningful when `fx` was passed — see SpendSummary.excludedCurrencyCount.
  excludedCurrencyCount?: number;
};

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

  const review: YearInReview = {
    totalSpentMinor,
    projectedAnnualMinor,
    activeCount: active.length,
    cancelledCount: subscriptions.filter((s) => s.status === "cancelled").length,
    mostExpensive,
    topCategory,
    busiestMonth
  };

  if (fx) {
    review.excludedCurrencyCount = excludedCurrencyCount;
  }

  return review;
}
