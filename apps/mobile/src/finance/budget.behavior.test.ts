import type { FxContext, Subscription } from "@zeno/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { budgetStatus, computeBudgetForecast, computeCategoryForecast, suggestedCapMinor } from "./budget";

// Switches the zone mid-test; skipped only where that is ignored (Stryker's
// worker threads, vitest.tz-setup.ts). Everywhere else the setup insists it works.
const itZone = process.env.ZENO_ZONE_SWITCH_IGNORED ? it.skip : it;

function sub(partial: Partial<Subscription> & { id: string }): Subscription {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    name: partial.id,
    category: "other",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "profile_local",
    source: "manual",
    ...partial
  };
}

// "now" is given as UTC instants, so these cases run with the device on UTC.
// "Today" and "this month" are the user's ("which today?", P5): tested below.
const DEVICE_TZ = process.env.TZ;
beforeEach(() => {
  process.env.TZ = "UTC";
});
afterEach(() => {
  if (DEVICE_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = DEVICE_TZ;
});

const chargeDays = (subscription: Subscription, now: Date) =>
  computeBudgetForecast([subscription], now).remaining.map((charge) => charge.date);

describe("computeBudgetForecast — cycles and edge cases", () => {
  const june15 = new Date("2026-06-15T12:00:00.000Z");

  it("contributes nothing for an unknown cycle, a missing date, or an unparseable date", () => {
    const forecast = computeBudgetForecast([
      sub({ id: "unknown", billingCycle: "unknown", nextRenewalDate: "2026-06-20T00:00:00.000Z" }),
      sub({ id: "no-date" }),
      sub({ id: "bad-date", nextRenewalDate: "someday" })
    ], june15);
    expect(forecast).toEqual({ committedMinor: 0, projectedMinor: 0, remaining: [], daysLeftInMonth: 16 });
  });

  it("counts a trial once, on its conversion date, and labels it", () => {
    const trial = sub({ id: "t", billingCycle: "trial", status: "trial", nextRenewalDate: "2026-06-22T09:00:00.000Z", price: { amountMinor: 1299, currency: "USD" } });
    expect(computeBudgetForecast([trial], june15)).toMatchObject({
      projectedMinor: 1299,
      committedMinor: 0,
      remaining: [{ id: "t", name: "t", amountMinor: 1299, date: "2026-06-22T09:00:00.000Z", note: "trial converts" }]
    });
    // A trial converting in another month contributes nothing to this one,
    // even though a monthly plan with the same date would.
    expect(computeBudgetForecast([{ ...trial, nextRenewalDate: "2026-07-22T09:00:00.000Z" }], june15).projectedMinor).toBe(0);
  });

  it("counts a quarterly plan only in the months it actually charges", () => {
    const quarterly = sub({ id: "q", billingCycle: "quarterly", nextRenewalDate: "2026-08-10T00:00:00.000Z", price: { amountMinor: 3000, currency: "USD" } });
    // Aug 10 -> May 10 (charged), Nov 10: nothing in June or July.
    expect(computeBudgetForecast([quarterly], new Date("2026-05-20T00:00:00.000Z")).committedMinor).toBe(3000);
    expect(computeBudgetForecast([quarterly], june15).projectedMinor).toBe(0);
    expect(computeBudgetForecast([quarterly], new Date("2026-07-20T00:00:00.000Z")).projectedMinor).toBe(0);
    expect(computeBudgetForecast([quarterly], new Date("2026-08-01T00:00:00.000Z")).projectedMinor).toBe(3000);
  });

  it("counts a charge at exactly 'now' as committed", () => {
    const forecast = computeBudgetForecast([sub({ id: "now", nextRenewalDate: june15.toISOString() })], june15);
    expect(forecast).toMatchObject({ committedMinor: 1000, projectedMinor: 1000, remaining: [] });
  });

  it("windows the month in UTC: a charge late on the last UTC day stays in that month", () => {
    const lateJune = sub({ id: "late", nextRenewalDate: "2026-06-30T23:30:00.000Z" });
    expect(chargeDays(lateJune, june15)).toEqual(["2026-06-30T23:30:00.000Z"]);
    expect(computeBudgetForecast([lateJune], new Date("2026-07-02T00:00:00.000Z")).committedMinor).toBe(0);
  });

  it("reports whole days left in the month, counting today", () => {
    expect(computeBudgetForecast([], june15).daysLeftInMonth).toBe(16);
    expect(computeBudgetForecast([], new Date("2026-06-01T00:00:00.000Z")).daysLeftInMonth).toBe(30);
    expect(computeBudgetForecast([], new Date("2026-06-30T23:30:00.000Z")).daysLeftInMonth).toBe(1);
  });

  it("lists remaining charges soonest first across subscriptions", () => {
    const forecast = computeBudgetForecast([
      sub({ id: "late", nextRenewalDate: "2026-06-28T00:00:00.000Z" }),
      sub({ id: "soon", nextRenewalDate: "2026-06-16T00:00:00.000Z" }),
      sub({ id: "mid", nextRenewalDate: "2026-06-20T00:00:00.000Z" })
    ], june15);
    expect(forecast.remaining.map((charge) => charge.id)).toEqual(["soon", "mid", "late"]);
    expect(forecast.remaining.every((charge) => charge.note === undefined)).toBe(true);
  });

  // Regression: each step was taken from the PREVIOUS (already clamped) date,
  // so once a 31st anchor passed through February it stayed on the 28th for
  // good: Jan 31 -> Feb 28 -> Mar 28 -> Apr 28. The April charge is Apr 30.
  // (Reachable in the app: a status "trial" plan on a monthly cycle is billable
  // but is not rolled forward for display, so its anchor can be months old.)
  it("keeps the anchor's day when stepping forward through a short month", () => {
    const monthly31 = sub({ id: "m", status: "trial", nextRenewalDate: "2026-01-31T09:00:00.000Z" });
    expect(chargeDays(monthly31, new Date("2026-04-15T00:00:00.000Z"))).toEqual(["2026-04-30T09:00:00.000Z"]);
    expect(chargeDays(monthly31, new Date("2026-05-15T00:00:00.000Z"))).toEqual(["2026-05-31T09:00:00.000Z"]);
  });

  it("keeps the anchor's day when stepping backward through a short month", () => {
    // May 31 anchor viewed in March: May 31 -> Apr 30 -> Mar 31 (not Mar 30).
    const monthly31 = sub({ id: "m", nextRenewalDate: "2026-05-31T09:00:00.000Z" });
    expect(chargeDays(monthly31, new Date("2026-03-01T00:00:00.000Z"))).toEqual(["2026-03-31T09:00:00.000Z"]);
  });

  it("returns an annual Feb 29 anchor to Feb 29 in the next leap year", () => {
    const leap = sub({ id: "a", billingCycle: "annual", nextRenewalDate: "2024-02-29T00:00:00.000Z", price: { amountMinor: 9900, currency: "USD" } });
    expect(chargeDays(leap, new Date("2028-02-01T00:00:00.000Z"))).toEqual(["2028-02-29T00:00:00.000Z"]);
    expect(chargeDays(leap, new Date("2027-02-01T00:00:00.000Z"))).toEqual(["2027-02-28T00:00:00.000Z"]);
  });

  // Regression: the month was reached by walking at most 200 cycles from the
  // anchor, so an anchor more than ~4 years (weekly) or ~17 years (monthly)
  // away never reached the month and the plan silently contributed nothing.
  it("still finds the month's charges for an anchor many cycles away", () => {
    const weekly = sub({ id: "w", billingCycle: "weekly", nextRenewalDate: "2020-01-06T08:00:00.000Z", price: { amountMinor: 500, currency: "USD" } });
    // 2020-01-06 is a Monday; June 2026 Mondays: 1, 8, 15, 22, 29.
    expect(computeBudgetForecast([weekly], june15)).toMatchObject({ projectedMinor: 2500, committedMinor: 1500 });
    const monthly = sub({ id: "m", nextRenewalDate: "2001-03-31T00:00:00.000Z" });
    expect(computeBudgetForecast([monthly], june15).remaining.map((charge) => charge.date)).toEqual(["2026-06-30T00:00:00.000Z"]);
    const farFuture = sub({ id: "f", nextRenewalDate: "2050-06-20T00:00:00.000Z" });
    expect(computeBudgetForecast([farFuture], june15).remaining.map((charge) => charge.date)).toEqual(["2026-06-20T00:00:00.000Z"]);
  });
});

describe("computeCategoryForecast — edge cases", () => {
  const june15 = new Date("2026-06-15T12:00:00.000Z");

  it("multiplies by the number of charges in the month and skips non-billable or chargeless plans", () => {
    const forecast = computeCategoryForecast([
      sub({ id: "wk", category: "health", billingCycle: "weekly", nextRenewalDate: "2026-06-18T00:00:00.000Z", price: { amountMinor: 500, currency: "USD" } }),
      sub({ id: "mo", category: "health", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "paused", category: "health", status: "paused", nextRenewalDate: "2026-06-20T00:00:00.000Z" }),
      sub({ id: "free", category: "education", price: { amountMinor: 0, currency: "USD" }, nextRenewalDate: "2026-06-20T00:00:00.000Z" }),
      sub({ id: "annual-elsewhere", category: "education", billingCycle: "annual", nextRenewalDate: "2026-11-01T00:00:00.000Z" })
    ], june15);
    expect(forecast).toEqual({ health: 4 * 500 + 1000 });
  });
});

describe("suggestedCapMinor", () => {
  it("rounds up to the next multiple of 5 major units, never below 5", () => {
    expect(suggestedCapMinor(1)).toBe(500);
    expect(suggestedCapMinor(500)).toBe(500);
    expect(suggestedCapMinor(501)).toBe(1000);
    expect(suggestedCapMinor(123456)).toBe(123500); // 1234.56 -> 1235
  });
});

describe("budgetStatus", () => {
  it("treats a missing or non-positive cap as 'under' (no cap to be over)", () => {
    expect(budgetStatus(999999, 0)).toBe("under");
    expect(budgetStatus(999999, -100)).toBe("under");
  });

  it("switches to 'approaching' only above 85% and to 'over' only above the cap", () => {
    expect(budgetStatus(8500, 10000)).toBe("under");
    expect(budgetStatus(8501, 10000)).toBe("approaching");
    expect(budgetStatus(10000, 10000)).toBe("approaching");
    expect(budgetStatus(10001, 10000)).toBe("over");
  });
});

// fx is only exercised here for the category path's null (no-rate) branch;
// the main conversion behaviour is covered in budget.test.ts.
describe("computeCategoryForecast — currency", () => {
  it("keeps same-currency amounts without a rate table entry", () => {
    const fx: FxContext = { homeCurrency: "INR", rates: {} };
    const forecast = computeCategoryForecast([
      sub({ id: "inr", category: "family", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 14900, currency: "INR" } }),
      sub({ id: "usd", category: "family", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 999, currency: "USD" } })
    ], new Date("2026-06-15T12:00:00.000Z"), fx);
    expect(forecast).toEqual({ family: 14900 });
  });
});

describe("the user's month and the user's today (\"which today?\", P5)", () => {
  itZone("22:00 on Oct 6 in New York (02:00 UTC on the 7th): the 7th's charge is still to renew; in Kolkata it has happened", () => {
    const now = new Date("2026-10-07T02:00:00.000Z");
    const list = [sub({ id: "n", nextRenewalDate: "2026-10-07T00:00:00.000Z", price: { amountMinor: 1549, currency: "USD" } })];
    process.env.TZ = "America/New_York";
    expect(computeBudgetForecast(list, now)).toMatchObject({ committedMinor: 0, projectedMinor: 1549 });
    process.env.TZ = "Asia/Kolkata";
    expect(computeBudgetForecast(list, now)).toMatchObject({ committedMinor: 1549, projectedMinor: 1549 });
  });

  itZone("23:30 UTC on Jun 30 is still June in New York and already July in Kolkata", () => {
    const now = new Date("2026-06-30T23:30:00.000Z");
    process.env.TZ = "America/New_York";
    expect(computeBudgetForecast([], now).daysLeftInMonth).toBe(1);
    process.env.TZ = "Asia/Kolkata";
    expect(computeBudgetForecast([], now).daysLeftInMonth).toBe(31);
  });
});
