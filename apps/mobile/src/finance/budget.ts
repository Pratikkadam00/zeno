import { convertMinor, type FxContext, type Subscription } from "@zeno/shared";

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
  // Only meaningful when `fx` was passed — count of billable subscriptions
  // excluded from committed/projected because no usable exchange rate existed
  // for their currency (never silently summed as if same-currency).
  excludedCurrencyCount?: number;
};

export type BudgetStatus = "under" | "approaching" | "over";

// UTC throughout — the cadence stepping below is UTC, so the month window must
// be too, or charges near a month edge land in the wrong month (and the result
// would vary by the user's timezone).
function monthBounds(now: Date): { start: number; end: number } {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1; // last ms of the month
  return { start, end };
}

function stepDate(date: Date, cycle: Subscription["billingCycle"], dir: 1 | -1): Date {
  if (cycle === "weekly") return new Date(date.getTime() + dir * 7 * DAY_MS);
  const months = cycle === "annual" ? 12 : cycle === "quarterly" ? 3 : 1;
  // Month-end clamp: stepping from Jan 31 lands on Feb 28/29, not "Feb 31"→Mar 3.
  const total = date.getUTCMonth() + dir * months;
  const year = date.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), daysInMonth);
  return new Date(Date.UTC(year, month, day, date.getUTCHours(), date.getUTCMinutes()));
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

export function computeBudgetForecast(subscriptions: Subscription[], now: Date = new Date(), fx?: FxContext): BudgetForecast {
  const { start, end } = monthBounds(now);
  const nowMs = now.getTime();
  let committedMinor = 0;
  let projectedMinor = 0;
  let excludedCurrencyCount = 0;
  const remaining: ForecastCharge[] = [];

  for (const sub of subscriptions) {
    if (!isBillable(sub)) continue;
    const dates = chargeDatesInMonth(sub, start, end);
    if (dates.length === 0) continue;

    const amountMinor = fx ? convertMinor(sub.price.amountMinor, sub.price.currency, fx.homeCurrency, fx.rates) : sub.price.amountMinor;
    if (amountMinor === null) {
      excludedCurrencyCount += 1;
      continue;
    }

    for (const date of dates) {
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
  const forecast: BudgetForecast = { committedMinor, projectedMinor, remaining, daysLeftInMonth };
  if (fx) {
    forecast.excludedCurrencyCount = excludedCurrencyCount;
  }
  return forecast;
}

/** Projected recurring spend per category this month (for category budgets). */
export function computeCategoryForecast(subscriptions: Subscription[], now: Date = new Date(), fx?: FxContext): Record<string, number> {
  const { start, end } = monthBounds(now);
  const out: Record<string, number> = {};
  for (const sub of subscriptions) {
    if (!isBillable(sub)) continue;
    const charges = chargeDatesInMonth(sub, start, end).length;
    if (charges === 0) continue;
    const amountMinor = fx ? convertMinor(sub.price.amountMinor, sub.price.currency, fx.homeCurrency, fx.rates) : sub.price.amountMinor;
    if (amountMinor === null) continue;
    out[sub.category] = (out[sub.category] ?? 0) + amountMinor * charges;
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
