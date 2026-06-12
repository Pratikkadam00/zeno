import type { Subscription } from "../domain";
import { formatMoneyMinor } from "../notifications/renewal-plan";
import { monthlyAmount } from "../spend/coach";

export type WidgetSnapshot = {
  generatedAt: string;
  nextRenewal?: {
    subscriptionId: string;
    name: string;
    amountLabel: string;
    dueAt: string;
    daysUntil: number;
  };
  monthlySpendLabel: string;
  activeCount: number;
  watchComplicationText: string;
};

export function createWidgetSnapshot(subscriptions: Subscription[], now = new Date()): WidgetSnapshot {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  const next = active
    .filter((subscription) => subscription.nextRenewalDate)
    .sort((a, b) => Date.parse(a.nextRenewalDate ?? "") - Date.parse(b.nextRenewalDate ?? ""))[0];
  const monthlySpend = active.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0);
  const snapshot: WidgetSnapshot = {
    generatedAt: now.toISOString(),
    monthlySpendLabel: formatMoneyMinor(monthlySpend),
    activeCount: active.length,
    watchComplicationText: next ? `${next.name} ${daysUntil(next.nextRenewalDate ?? "", now)}d` : "No renewals"
  };

  if (next?.nextRenewalDate) {
    snapshot.nextRenewal = {
      subscriptionId: next.id,
      name: next.name,
      amountLabel: formatMoneyMinor(next.price.amountMinor, next.price.currency),
      dueAt: next.nextRenewalDate,
      daysUntil: daysUntil(next.nextRenewalDate, now)
    };
  }

  return snapshot;
}

function daysUntil(date: string, now: Date): number {
  return Math.max(0, Math.ceil((Date.parse(date) - now.getTime()) / 86_400_000));
}
