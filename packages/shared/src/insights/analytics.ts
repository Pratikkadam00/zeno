import type { Subscription, SubscriptionCategory } from "../domain";
import { monthlyAmount, monthlyAmountIn, type FxContext } from "../spend/coach";

export type AnalyticsSnapshot = {
  monthlySpendMinor: number;
  annualizedSpendMinor: number;
  activeSubscriptionCount: number;
  averageMonthlySubscriptionMinor: number;
  highestCategory?: {
    category: SubscriptionCategory;
    monthlySpendMinor: number;
  };
  renewalLoadNext30Days: number;
  cancellationOpportunityMinor: number;
  // Only meaningful when `fx` was passed — see SpendSummary.excludedCurrencyCount.
  excludedCurrencyCount?: number;
};

export function createAnalyticsSnapshot(subscriptions: Subscription[], now = new Date(), fx?: FxContext): AnalyticsSnapshot {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  let excludedCurrencyCount = 0;

  const amountFor = (subscription: Subscription): number | null =>
    fx ? monthlyAmountIn(subscription, fx.homeCurrency, fx.rates) : monthlyAmount(subscription);

  let monthlySpendMinor = 0;
  const categorySpend = new Map<SubscriptionCategory, number>();

  for (const subscription of active) {
    const amount = amountFor(subscription);
    if (amount === null) {
      excludedCurrencyCount += 1;
      continue;
    }
    monthlySpendMinor += amount;
    categorySpend.set(subscription.category, (categorySpend.get(subscription.category) ?? 0) + amount);
  }

  const highestCategory = [...categorySpend.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, spend]) => ({ category, monthlySpendMinor: spend }))[0];

  const cancellationOpportunityMinor = active
    .filter((subscription) => subscription.valueRating === "low")
    .reduce((sum, subscription) => {
      const amount = amountFor(subscription);
      return amount === null ? sum : sum + amount;
    }, 0);

  // Average over only the subscriptions actually folded into monthlySpendMinor
  // — subscriptions excluded for a missing exchange rate (excludedCurrencyCount)
  // contribute nothing to the sum, so including them in the denominator too
  // would silently understate the average (e.g. 1 included subscription out
  // of 2 active would report half its real monthly cost as "the average").
  const includedCount = active.length - excludedCurrencyCount;
  const snapshot: AnalyticsSnapshot = {
    monthlySpendMinor,
    annualizedSpendMinor: monthlySpendMinor * 12,
    activeSubscriptionCount: active.length,
    averageMonthlySubscriptionMinor: includedCount ? Math.round(monthlySpendMinor / includedCount) : 0,
    renewalLoadNext30Days: countRenewalsWithin(active, now, 30),
    cancellationOpportunityMinor
  };

  if (highestCategory) {
    snapshot.highestCategory = highestCategory;
  }

  if (fx) {
    snapshot.excludedCurrencyCount = excludedCurrencyCount;
  }

  return snapshot;
}

function countRenewalsWithin(subscriptions: Subscription[], now: Date, days: number): number {
  const start = now.getTime();
  const end = start + days * 86_400_000;
  return subscriptions.filter((subscription) => {
    if (!subscription.nextRenewalDate) {
      return false;
    }
    const due = Date.parse(subscription.nextRenewalDate);
    return due >= start && due <= end;
  }).length;
}
