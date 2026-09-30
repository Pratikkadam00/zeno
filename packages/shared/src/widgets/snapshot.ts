import type { CurrencyCode, Subscription } from "../domain";
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
  // Only set when `fx` was passed — active subscriptions left out of
  // monthlySpendLabel because no rate converts their currency (see
  // SpendSummary.excludedCurrencyCount).
  excludedCurrencyCount?: number;
};

export function createWidgetSnapshot(subscriptions: Subscription[], now = new Date(), fx?: FxContext): WidgetSnapshot {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  const next = soonestRenewal(active);

  let excludedCurrencyCount = 0;
  let monthlySpendLabel: string;
  if (fx) {
    const monthlySpend = active.reduce((sum, subscription) => {
      const amount = monthlyAmountIn(subscription, fx.homeCurrency, fx.rates);
      if (amount === null) {
        excludedCurrencyCount += 1;
        return sum;
      }
      return sum + amount;
    }, 0);
    monthlySpendLabel = formatMoneyMinor(monthlySpend, fx.homeCurrency);
  } else {
    monthlySpendLabel = nativeSpendLabel(active);
  }

  const snapshot: WidgetSnapshot = {
    generatedAt: now.toISOString(),
    monthlySpendLabel,
    activeCount: active.length,
    watchComplicationText: next
      ? `${next.subscription.name} ${complicationDueLabel(daysUntil(next.dueMs, now))}`
      : "No renewals"
  };

  if (next) {
    snapshot.nextRenewal = {
      subscriptionId: next.subscription.id,
      name: next.subscription.name,
      amountLabel: formatMoneyMinor(next.subscription.price.amountMinor, next.subscription.price.currency),
      dueAt: next.dueAt,
      daysUntil: daysUntil(next.dueMs, now)
    };
  }

  if (fx) {
    snapshot.excludedCurrencyCount = excludedCurrencyCount;
  }

  return snapshot;
}

// Without fx there is neither a home currency nor a rate, so amounts in
// different currencies cannot be added (the old code summed raw minor units —
// $10 + ₹499 read "$509.00" — and always printed "$"). One total per currency,
// in first-seen order; zero contributions (trials) are skipped; "$0.00" when
// nothing recurs, as before.
function nativeSpendLabel(active: Subscription[]): string {
  const totals = new Map<CurrencyCode, number>();
  for (const subscription of active) {
    const amount = monthlyAmount(subscription);
    if (amount !== 0) {
      const currency = subscription.price.currency;
      totals.set(currency, (totals.get(currency) ?? 0) + amount);
    }
  }
  if (totals.size === 0) {
    return formatMoneyMinor(0);
  }
  return [...totals].map(([currency, amount]) => formatMoneyMinor(amount, currency)).join(" + ");
}

function soonestRenewal(active: Subscription[]): { subscription: Subscription; dueAt: string; dueMs: number } | undefined {
  let next: { subscription: Subscription; dueAt: string; dueMs: number } | undefined;
  for (const subscription of active) {
    const dueAt = subscription.nextRenewalDate;
    if (!dueAt) {
      continue;
    }
    // An unparseable date must not become "next": as NaN it sorted
    // unpredictably and rendered as "NaNd".
    const dueMs = Date.parse(dueAt);
    if (Number.isNaN(dueMs)) {
      continue;
    }
    if (!next || dueMs < next.dueMs) {
      next = { subscription, dueAt, dueMs };
    }
  }
  return next;
}

function daysUntil(dueMs: number, now: Date): number {
  // Floor so a renewal less than 24h away reads as 0 ("today") rather than
  // rounding up to a full day and hiding the imminent charge.
  return Math.max(0, Math.floor((dueMs - now.getTime()) / 86_400_000));
}

function complicationDueLabel(days: number): string {
  return days <= 0 ? "today" : `${days}d`;
}
