import type { Subscription, SubscriptionCategory } from "../domain";
import { monthlyAmount } from "./coach";
import { buildMonthlySpendHistory } from "./history";

export type YearInReview = {
  totalSpentMinor: number;           // actual cash out over the trailing 12 months
  projectedAnnualMinor: number;      // annualized current recurring spend
  activeCount: number;
  cancelledCount: number;
  mostExpensive: { name: string; monthlyMinor: number } | null;
  topCategory: { category: SubscriptionCategory; monthlyMinor: number } | null;
  busiestMonth: { label: string; amountMinor: number } | null;
};

/**
 * "Subscriptions Wrapped" — a year-in-review summary computed from real
 * subscription data: how much actually went out over the last 12 months, the
 * priciest sub, the category that ate the most, the most expensive month, and
 * how many were cancelled. Shareable retention moment.
 */
export function buildYearInReview(subscriptions: Subscription[], now: Date = new Date()): YearInReview {
  const history = buildMonthlySpendHistory(subscriptions, 12, now);
  const totalSpentMinor = history.reduce((sum, point) => sum + point.amountMinor, 0);

  const active = subscriptions.filter(
    (s) => s.status === "active" && s.billingCycle !== "trial" && s.billingCycle !== "unknown"
  );

  let mostExpensive: YearInReview["mostExpensive"] = null;
  const categoryTotals = new Map<SubscriptionCategory, number>();
  for (const subscription of active) {
    const monthly = monthlyAmount(subscription);
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

  return {
    totalSpentMinor,
    projectedAnnualMinor: active.reduce((sum, s) => sum + monthlyAmount(s), 0) * 12,
    activeCount: active.length,
    cancelledCount: subscriptions.filter((s) => s.status === "cancelled").length,
    mostExpensive,
    topCategory,
    busiestMonth
  };
}
