import type { Subscription } from "../domain";
import { formatMoneyMinor } from "../notifications/renewal-plan";
import { monthlyAmount, monthlyAmountIn, type FxContext } from "../spend/coach";

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

export function createWidgetSnapshot(subscriptions: Subscription[], now = new Date(), fx?: FxContext): WidgetSnapshot {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  const next = active
    .filter((subscription) => subscription.nextRenewalDate)
    .sort((a, b) => Date.parse(a.nextRenewalDate ?? "") - Date.parse(b.nextRenewalDate ?? ""))[0];
  const monthlySpend = active.reduce((sum, subscription) => {
    const amount = fx ? monthlyAmountIn(subscription, fx.homeCurrency, fx.rates) : monthlyAmount(subscription);
    return amount === null ? sum : sum + amount;
  }, 0);
  const snapshot: WidgetSnapshot = {
    generatedAt: now.toISOString(),
    monthlySpendLabel: formatMoneyMinor(monthlySpend, fx?.homeCurrency),
    activeCount: active.length,
    watchComplicationText: next
      ? `${next.name} ${complicationDueLabel(daysUntil(next.nextRenewalDate ?? "", now))}`
      : "No renewals"
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
  // Floor so a renewal less than 24h away reads as 0 ("today") rather than
  // rounding up to a full day and hiding the imminent charge.
  return Math.max(0, Math.floor((Date.parse(date) - now.getTime()) / 86_400_000));
}

function complicationDueLabel(days: number): string {
  return days <= 0 ? "today" : `${days}d`;
}
