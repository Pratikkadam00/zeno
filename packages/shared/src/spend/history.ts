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

function anchorDate(subscription: Subscription): Date {
  // The renewal date carries the anniversary (month, and day of month). Fall
  // back to createdAt when it is absent OR unparseable: an unparseable (or
  // empty) date gave a NaN month, so the charge matched no month and silently
  // vanished from history.
  const renewal = subscription.nextRenewalDate ? Date.parse(subscription.nextRenewalDate) : Number.NaN;
  const ref = Number.isNaN(renewal) ? Date.parse(subscription.createdAt) : renewal;
  return new Date(ref);
}

// The day this subscription charges in a given month: its anniversary day, or
// the month's last day when the month is shorter (the 31st in February is the 28th).
function chargeDayIn(subscription: Subscription, year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(anchorDate(subscription).getUTCDate(), lastDay));
}

/**
 * When billing stopped (F147). `undefined`: still billing. `null`: counts
 * nothing. Otherwise the instant billing ended; a charge dated before it was
 * paid and counts.
 * - active, and "attention" (charged again after cancelling): still billing.
 * - pending (a reported cancel) and cancelled: billing ended when the user
 *   reported cancelling, `cancellationRequestedAt`. Every cancel path in the app
 *   records it (requestCancellation; verification and "charged again" keep it).
 * - anything else (paused, trial, unknown), and a cancel with no readable date:
 *   nothing. No date is invented. (A paused plan's past months are F163.)
 */
function billingEndsAt(subscription: Subscription): number | null | undefined {
  if (subscription.status === "active" || subscription.status === "attention") return undefined;
  if (subscription.status === "pending" || subscription.status === "cancelled") {
    const ended = subscription.cancellationRequestedAt ? Date.parse(subscription.cancellationRequestedAt) : Number.NaN;
    return Number.isNaN(ended) ? null : ended;
  }
  return null;
}

function chargeInMonth(subscription: Subscription, year: number, month: number, fx?: FxContext): number {
  const endsAt = billingEndsAt(subscription);
  if (endsAt === null) return 0;
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
  // A cycle charge in this month counts only if it fell before billing ended.
  const charged = (amountMinor: number): number =>
    endsAt === undefined || chargeDayIn(subscription, year, month) < endsAt ? convert(amountMinor) : 0;

  const price = subscription.price.amountMinor;
  const anchorMonth = anchorDate(subscription).getUTCMonth();
  switch (subscription.billingCycle) {
    case "monthly":
      return charged(price);
    case "weekly": {
      // month-equivalent of weekly charges; monthlyAmount already normalizes
      // the cycle, fx-conversion (if any) is applied on top of that. In the
      // month billing ended, only the share of the month before the end counts.
      const full = fx ? (convertMinor(monthlyAmount(subscription), subscription.price.currency, fx.homeCurrency, fx.rates) ?? 0) : monthlyAmount(subscription);
      if (endsAt === undefined) return full;
      const monthEnd = Date.UTC(year, month + 1, 1);
      const share = Math.min(1, Math.max(0, (endsAt - monthStamp) / (monthEnd - monthStamp)));
      return Math.round(full * share);
    }
    case "quarterly":
      return (((month - anchorMonth) % 3) + 3) % 3 === 0 ? charged(price) : 0;
    case "annual":
      return month === anchorMonth ? charged(price) : 0;
    default:
      return 0;
  }
}
