import type { Subscription } from "@zeno/shared";

/* Subscription-first, forecast-led budgeting — all derived from real renewal
   dates (no bank feed). "committed" = charges that have already hit this month;
   "projected" = forecast month-end (committed + remaining renewals + trial
   conversions). Cash-flow basis: a subscription contributes its full amount in
   the month it actually charges. */

const DAY_MS = 24 * 60 * 60 * 1000;

export type ForecastCharge = { id: string; name: string; amountMinor: number; date: string; note?: string };

export type BudgetForecast = {
  committedMinor: number;
  projectedMinor: number;
  remaining: ForecastCharge[];
  daysLeftInMonth: number;
};

export type BudgetStatus = "under" | "approaching" | "over";

function monthBounds(now: Date): { start: number; end: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

function stepDate(date: Date, cycle: Subscription["billingCycle"], dir: 1 | -1): Date {
  if (cycle === "weekly") return new Date(date.getTime() + dir * 7 * DAY_MS);
  const months = cycle === "annual" ? 12 : cycle === "quarterly" ? 3 : 1;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + dir * months, date.getUTCDate()));
}

/** Every date this subscription charges within [start, end], stepping from its
 *  next renewal both forward and back by its cycle. */
function chargeDatesInMonth(sub: Subscription, start: number, end: number): Date[] {
  const cycle = sub.billingCycle;
  if (cycle === "unknown" || !sub.nextRenewalDate) return [];
  const anchor = new Date(sub.nextRenewalDate);
  if (Number.isNaN(anchor.getTime())) return [];

  const out: Date[] = [];
  let cursor = new Date(anchor);
  let guard = 0;
  while (cursor.getTime() <= end && guard++ < 200) {
    if (cursor.getTime() >= start) out.push(new Date(cursor));
    if (cycle === "trial") break; // a trial converts once
    cursor = stepDate(cursor, cycle, 1);
  }
  if (cycle !== "trial") {
    cursor = stepDate(anchor, cycle, -1);
    guard = 0;
    while (cursor.getTime() >= start && guard++ < 200) {
      if (cursor.getTime() <= end) out.push(new Date(cursor));
      cursor = stepDate(cursor, cycle, -1);
    }
  }
  return out;
}

function isBillable(sub: Subscription): boolean {
  return (sub.status === "active" || sub.status === "trial") && sub.price.amountMinor > 0;
}

export function computeBudgetForecast(subscriptions: Subscription[], now: Date = new Date()): BudgetForecast {
  const { start, end } = monthBounds(now);
  const nowMs = now.getTime();
  let committedMinor = 0;
  let projectedMinor = 0;
  const remaining: ForecastCharge[] = [];

  for (const sub of subscriptions) {
    if (!isBillable(sub)) continue;
    for (const date of chargeDatesInMonth(sub, start, end)) {
      const amountMinor = sub.price.amountMinor;
      projectedMinor += amountMinor;
      if (date.getTime() <= nowMs) {
        committedMinor += amountMinor;
      } else {
        remaining.push({
          id: sub.id,
          name: sub.name,
          amountMinor,
          date: date.toISOString(),
          note: sub.billingCycle === "trial" ? "trial converts" : undefined
        });
      }
    }
  }

  remaining.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const daysLeftInMonth = Math.max(0, Math.ceil((end - nowMs) / DAY_MS));
  return { committedMinor, projectedMinor, remaining, daysLeftInMonth };
}

/** Projected recurring spend per category this month (for category budgets). */
export function computeCategoryForecast(subscriptions: Subscription[], now: Date = new Date()): Record<string, number> {
  const { start, end } = monthBounds(now);
  const out: Record<string, number> = {};
  for (const sub of subscriptions) {
    if (!isBillable(sub)) continue;
    const charges = chargeDatesInMonth(sub, start, end).length;
    if (charges > 0) {
      out[sub.category] = (out[sub.category] ?? 0) + sub.price.amountMinor * charges;
    }
  }
  return out;
}

/** Round a projected amount (minor units) up to the nearest $5 for a suggested cap. */
export function suggestedCapMinor(projectedMinor: number): number {
  const dollars = projectedMinor / 100;
  return Math.max(5, Math.ceil(dollars / 5) * 5) * 100;
}

export function budgetStatus(projectedMinor: number, capMinor: number): BudgetStatus {
  if (capMinor <= 0) return "under";
  if (projectedMinor > capMinor) return "over";
  if (projectedMinor > 0.85 * capMinor) return "approaching";
  return "under";
}
