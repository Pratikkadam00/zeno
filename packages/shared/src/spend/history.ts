import type { Subscription } from "../domain";
import { convertMinor, monthlyAmount, type FxContext } from "./coach";

export type MonthlySpendPoint = {
  year: number;
  month: number; // 0-11
  label: string;
  amountMinor: number;
};

/**
 * Actual cash-out per calendar month derived from real subscription attributes
 * (createdAt, billingCycle, price, renewal anniversary) over the trailing
 * `months` window. Unlike an amortized monthly figure, annual charges land as a
 * spike in their anniversary month and quarterly charges every third month, so
 * the chart reflects when money actually leaves — and a sub only contributes
 * from the month it was added. Deterministic (UTC) for stable SSR/hydration.
 *
 * When `fx` is passed, each charge is converted into fx.homeCurrency; a
 * subscription whose currency has no usable rate contributes 0 for that month
 * (never a fabricated number) — the aggregate exclusion count is surfaced by
 * callers that already sum across the same subscription list (e.g.
 * buildYearInReview), not duplicated here per-point.
 */
export function buildMonthlySpendHistory(subscriptions: Subscription[], months = 6, now: Date = new Date(), fx?: FxContext): MonthlySpendPoint[] {
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const points: MonthlySpendPoint[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    let amountMinor = 0;
    for (const subscription of subscriptions) {
      amountMinor += chargeInMonth(subscription, year, month, fx);
    }
    points.push({ year, month, label: monthFmt.format(d), amountMinor });
  }

  return points;
}

function anchorMonth(subscription: Subscription): number {
  const ref = subscription.nextRenewalDate ?? subscription.createdAt;
  return new Date(ref).getUTCMonth();
}

function chargeInMonth(subscription: Subscription, year: number, month: number, fx?: FxContext): number {
  if (subscription.status !== "active") return 0;
  if (subscription.billingCycle === "trial" || subscription.billingCycle === "unknown") return 0;

  const created = new Date(subscription.createdAt);
  const monthStamp = Date.UTC(year, month, 1);
  if (monthStamp < Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), 1)) {
    return 0; // subscription didn't exist yet
  }

  const convert = (amountMinor: number): number => {
    if (!fx) return amountMinor;
    return convertMinor(amountMinor, subscription.price.currency, fx.homeCurrency, fx.rates) ?? 0;
  };

  const price = subscription.price.amountMinor;
  switch (subscription.billingCycle) {
    case "monthly":
      return convert(price);
    case "weekly":
      // month-equivalent of weekly charges; monthlyAmount already normalizes
      // the cycle, fx-conversion (if any) is applied on top of that.
      return fx ? (convertMinor(monthlyAmount(subscription), subscription.price.currency, fx.homeCurrency, fx.rates) ?? 0) : monthlyAmount(subscription);
    case "quarterly":
      return (((month - anchorMonth(subscription)) % 3) + 3) % 3 === 0 ? convert(price) : 0;
    case "annual":
      return month === anchorMonth(subscription) ? convert(price) : 0;
    default:
      return 0;
  }
}
