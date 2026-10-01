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

function monthsPerCycle(cycle: Subscription["billingCycle"]): number {
  return cycle === "annual" ? 12 : cycle === "quarterly" ? 3 : 1;
}

/** The charge `n` whole cycles from `anchor` (n may be negative). Always
 *  computed from the ANCHOR, never from a previous charge: stepping from an
 *  already-clamped date loses the day for good (Jan 31 → Feb 28 → Mar 28 → …). */
function stepDate(anchor: Date, cycle: Subscription["billingCycle"], n: number): Date {
  if (cycle === "weekly") return new Date(anchor.getTime() + n * 7 * DAY_MS);
  // Month-end clamp: Jan 31 + 1 month lands on Feb 28/29, not "Feb 31"→Mar 3.
  const total = anchor.getUTCMonth() + n * monthsPerCycle(cycle);
  const year = anchor.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(anchor.getUTCDate(), daysInMonth);
  return new Date(Date.UTC(year, month, day, anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds()));
}

/** Every date this subscription charges within [start, end], stepping from its
 *  next renewal both forward and back by its cycle. */
function chargeDatesInMonth(sub: Subscription, start: number, end: number): Date[] {
  const cycle = sub.billingCycle;
  if (cycle === "unknown" || !sub.nextRenewalDate) return [];
  const anchor = new Date(sub.nextRenewalDate);
  if (Number.isNaN(anchor.getTime())) return [];
  // A trial converts once, on its renewal date.
  if (cycle === "trial") return anchor.getTime() >= start && anchor.getTime() <= end ? [anchor] : [];

  // Jump straight to a cycle that falls before the window, rather than walking
  // there one cycle at a time: the old 200-step walk never reached the month
  // for an anchor more than ~4 years (weekly) or ~17 years (monthly) away.
  // Weekly: the last charge at or before `start`. Month-based: a cycle whose
  // month is strictly before the window's month.
  const windowStart = new Date(start);
  let n = cycle === "weekly"
    ? Math.floor((start - anchor.getTime()) / (7 * DAY_MS))
    : Math.floor(((windowStart.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + windowStart.getUTCMonth() - anchor.getUTCMonth()) / monthsPerCycle(cycle)) - 1;
  const out: Date[] = [];
  for (let charge = stepDate(anchor, cycle, n); charge.getTime() <= end; charge = stepDate(anchor, cycle, ++n)) {
    if (charge.getTime() >= start) out.push(charge);
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

export type BudgetRecap = { recapIndex: number; streak: number };

/**
 * Which month the recap covers, and the streak under the cap (F143). Only a
 * COMPLETE month that began after the cap was set counts: the recap compared
 * months before any budget existed against today's cap, and a new user's past
 * months are $0 (nothing was tracked yet), so installing the app and setting a
 * budget gave a "5-month streak under cap" to share. Null until such a month
 * exists. `history` is oldest first, in UTC months (buildMonthlySpendHistory).
 */
export function budgetRecap(
  history: { year: number; month: number; amountMinor: number }[],
  capMinor: number,
  capSetAt: string | null,
  now: Date = new Date()
): BudgetRecap | null {
  const setAt = capSetAt ? Date.parse(capSetAt) : Number.NaN;
  if (Number.isNaN(setAt)) return null;
  const currentMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const counts = (point: { year: number; month: number }) => {
    const start = Date.UTC(point.year, point.month, 1);
    return start >= setAt && start < currentMonth;
  };
  let recapIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (counts(history[i]!)) { recapIndex = i; break; }
  }
  if (recapIndex < 0) return null;
  let streak = 0;
  for (let i = recapIndex; i >= 0 && counts(history[i]!) && history[i]!.amountMinor <= capMinor; i--) streak++;
  return { recapIndex, streak };
}
