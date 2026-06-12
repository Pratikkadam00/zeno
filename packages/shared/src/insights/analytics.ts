import type { Subscription, SubscriptionCategory } from "../domain";
import { monthlyAmount } from "../spend/coach";

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
};

export function createAnalyticsSnapshot(subscriptions: Subscription[], now = new Date()): AnalyticsSnapshot {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  const monthlySpendMinor = active.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0);
  const categorySpend = new Map<SubscriptionCategory, number>();

  for (const subscription of active) {
    categorySpend.set(subscription.category, (categorySpend.get(subscription.category) ?? 0) + monthlyAmount(subscription));
  }

  const highestCategory = [...categorySpend.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, spend]) => ({ category, monthlySpendMinor: spend }))[0];

  const snapshot: AnalyticsSnapshot = {
    monthlySpendMinor,
    annualizedSpendMinor: monthlySpendMinor * 12,
    activeSubscriptionCount: active.length,
    averageMonthlySubscriptionMinor: active.length ? Math.round(monthlySpendMinor / active.length) : 0,
    renewalLoadNext30Days: countRenewalsWithin(active, now, 30),
    cancellationOpportunityMinor: active
      .filter((subscription) => subscription.valueRating === "low")
      .reduce((sum, subscription) => sum + monthlyAmount(subscription), 0)
  };

  if (highestCategory) {
    snapshot.highestCategory = highestCategory;
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
