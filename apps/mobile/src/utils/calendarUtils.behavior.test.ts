import type { BillingCycle, FxContext, Subscription, SubscriptionCategory } from "@zeno/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMarkedDates, getProjectedAnnual, getSubscriptionsForDate, getWeeklyGroups } from "./calendarUtils";
import { getDaysRemaining } from "./subscription-ui";

// Node re-reads process.env.TZ on assignment; deleting it does NOT restore the
// original zone, so it is put back by name.
const ORIGINAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
function inTimeZone<T>(tz: string, fn: () => T): T {
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

function sub(overrides: Partial<Subscription> & { id: string }): Subscription {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    name: overrides.id,
    category: "productivity",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly" as BillingCycle,
    status: "active",
    ownerProfileId: "profile_local",
    source: "manual",
    ...overrides
  };
}

const ids = (list: Subscription[]) => list.map((item) => item.id);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getMarkedDates", () => {
  it("only marks active subscriptions that have a parseable renewal date", () => {
    const marked = getMarkedDates([
      sub({ id: "active", nextRenewalDate: "2026-06-01T09:00:00.000Z" }),
      sub({ id: "cancelled", status: "cancelled", nextRenewalDate: "2026-06-01T09:00:00.000Z" }),
      sub({ id: "paused", status: "paused", nextRenewalDate: "2026-06-01T09:00:00.000Z" }),
      sub({ id: "trial-status", status: "trial", nextRenewalDate: "2026-06-01T09:00:00.000Z" }),
      sub({ id: "no-date" }),
      sub({ id: "bad-date", nextRenewalDate: "not-a-date" })
    ]);
    expect(Object.keys(marked)).toEqual(["2026-06-01"]);
    expect(marked["2026-06-01"]).toEqual({ marked: true, dots: [{ key: "active", color: "#3B82F6" }] });
  });

  it("keys each renewal by its UTC calendar day, whatever the device timezone", () => {
    const list = [sub({ id: "late", nextRenewalDate: "2026-05-29T23:30:00.000Z" })];
    // In Kolkata this instant is already May 30 locally; in LA it is still May 29.
    expect(Object.keys(inTimeZone("Asia/Kolkata", () => getMarkedDates(list)))).toEqual(["2026-05-29"]);
    expect(Object.keys(inTimeZone("America/Los_Angeles", () => getMarkedDates(list)))).toEqual(["2026-05-29"]);
  });

  it("colours each dot by category, folding entertainment into streaming and developer/family/finance into the neutral dot", () => {
    const categories: SubscriptionCategory[] = ["entertainment", "ai_tools", "productivity", "health", "education", "developer_tools", "family", "finance", "other"];
    const marked = getMarkedDates(categories.map((category) => sub({ id: category, category, nextRenewalDate: "2026-06-03T09:00:00.000Z" })));
    const colours = Object.fromEntries(marked["2026-06-03"]?.dots.map((dot) => [dot.key, dot.color]) ?? []);
    expect(colours).toEqual({
      entertainment: "#EF4444",
      ai_tools: "#8B5CF6",
      productivity: "#3B82F6",
      health: "#F59E0B",
      education: "#06B6D4",
      developer_tools: "#6B7280",
      family: "#6B7280",
      finance: "#6B7280",
      other: "#6B7280"
    });
  });

  // Rows read back from SQLite are not validated (storage/subscription-repository
  // mapRow passes row.category straight through), so a category string outside
  // today's union — e.g. the service catalog's "gaming"/"music" — can reach here.
  it("still colours legacy gaming/music category strings from an unvalidated row", () => {
    const legacy = (category: string) => category as SubscriptionCategory;
    const marked = getMarkedDates([
      sub({ id: "g", category: legacy("gaming"), nextRenewalDate: "2026-06-04T09:00:00.000Z" }),
      sub({ id: "m", category: legacy("music"), nextRenewalDate: "2026-06-04T09:00:00.000Z" })
    ]);
    expect(marked["2026-06-04"]?.dots).toEqual([{ key: "g", color: "#10B981" }, { key: "m", color: "#EC4899" }]);
  });
});

describe("getSubscriptionsForDate", () => {
  const list = [
    sub({ id: "pricey", nextRenewalDate: "2026-06-01T08:00:00.000Z", price: { amountMinor: 5000, currency: "USD" } }),
    sub({ id: "cheap", nextRenewalDate: "2026-06-01T20:00:00.000Z", price: { amountMinor: 300, currency: "USD" } }),
    sub({ id: "cancelled", status: "cancelled", nextRenewalDate: "2026-06-01T08:00:00.000Z" }),
    sub({ id: "no-date" }),
    sub({ id: "bad-date", nextRenewalDate: "junk" }),
    sub({ id: "other-day", nextRenewalDate: "2026-06-02T08:00:00.000Z" })
  ];

  it("returns the day's active renewals, cheapest first", () => {
    expect(ids(getSubscriptionsForDate(list, "2026-06-01"))).toEqual(["cheap", "pricey"]);
  });

  it("accepts a full ISO timestamp for the day and matches on its UTC day", () => {
    expect(ids(getSubscriptionsForDate(list, "2026-06-01T23:59:59.000Z"))).toEqual(["cheap", "pricey"]);
  });

  it("returns nothing for an unparseable day", () => {
    expect(getSubscriptionsForDate(list, "not-a-day")).toEqual([]);
  });
});

describe("getWeeklyGroups", () => {
  // now = 2026-05-29T12:00Z. Offsets are whole UTC days from today.
  const day = (offset: number, hour = 9) => new Date(Date.UTC(2026, 4, 29 + offset, hour)).toISOString();

  it("buckets by whole UTC days: 0-7 this week, 8-14 next week, 15-30 later this month, else nothing", () => {
    const groups = getWeeklyGroups([
      sub({ id: "d-1", nextRenewalDate: day(-1) }),
      sub({ id: "d0-earlier-today", nextRenewalDate: day(0, 1) }),
      sub({ id: "d7", nextRenewalDate: day(7) }),
      sub({ id: "d8", nextRenewalDate: day(8) }),
      sub({ id: "d14", nextRenewalDate: day(14) }),
      sub({ id: "d15", nextRenewalDate: day(15) }),
      sub({ id: "d30", nextRenewalDate: day(30) }),
      sub({ id: "d31", nextRenewalDate: day(31) }),
      sub({ id: "bad", nextRenewalDate: "junk" }),
      sub({ id: "cancelled", status: "cancelled", nextRenewalDate: day(2) }),
      sub({ id: "no-date" })
    ]);
    expect(ids(groups.thisWeek)).toEqual(["d0-earlier-today", "d7"]);
    expect(ids(groups.nextWeek)).toEqual(["d8", "d14"]);
    expect(ids(groups.laterThisMonth)).toEqual(["d15", "d30"]);
  });

  it("sorts each bucket by renewal date, soonest first", () => {
    const groups = getWeeklyGroups([
      sub({ id: "d5", nextRenewalDate: day(5) }),
      sub({ id: "d1-late", nextRenewalDate: day(1, 22) }),
      sub({ id: "d1-early", nextRenewalDate: day(1, 3) }),
      sub({ id: "d12", nextRenewalDate: day(12) }),
      sub({ id: "d9", nextRenewalDate: day(9) }),
      sub({ id: "d20", nextRenewalDate: day(20) }),
      sub({ id: "d16", nextRenewalDate: day(16) })
    ]);
    expect(ids(groups.thisWeek)).toEqual(["d1-early", "d1-late", "d5"]);
    expect(ids(groups.nextWeek)).toEqual(["d9", "d12"]);
    expect(ids(groups.laterThisMonth)).toEqual(["d16", "d20"]);
  });

  // Regression: day gaps were measured between LOCAL midnights. Across the US
  // spring-forward night a "day" is 23 hours, so 8 days came out as
  // floor(7.96) = 7 and the renewal was put in "this week" — while the same
  // screen's getDaysRemaining (UTC days) said 8.
  it("does not lose a day across a DST change (New York, March 2026)", () => {
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
    const renewal = "2026-03-09T12:00:00.000Z";
    const groups = inTimeZone("America/New_York", () => getWeeklyGroups([sub({ id: "eight-days", nextRenewalDate: renewal })]));
    expect(ids(groups.nextWeek)).toEqual(["eight-days"]);
    expect(groups.thisWeek).toEqual([]);
  });

  // Regression: a renewal stored as a UTC day (midnight UTC) is the previous
  // local evening west of UTC, so the local-day bucket disagreed with the
  // UTC-day countdown shown for the same subscription.
  it("agrees with getDaysRemaining on the day count in every timezone", () => {
    const renewal = "2026-06-06T00:00:00.000Z"; // 8 UTC days after 2026-05-29
    for (const tz of ["America/Los_Angeles", "Asia/Kolkata", "UTC"]) {
      const { groups, days } = inTimeZone(tz, () => ({
        groups: getWeeklyGroups([sub({ id: "x", nextRenewalDate: renewal })]),
        days: getDaysRemaining(renewal)
      }));
      expect(days, tz).toBe(8);
      expect(ids(groups.nextWeek), tz).toEqual(["x"]);
    }
  });
});

describe("getProjectedAnnual: a year of these plans at their current price (F196)", () => {
  // The design's "Projected year" is the month's run-rate times twelve
  // (ui_kits/app/CalendarScreen.jsx), the same figure as a subscription's own
  // "Per year at current rate". It was the rest of THIS calendar year: $46.47
  // for a $15.49 plan in October, beside the detail screen's $185.88.
  const soon = "2026-06-10T09:00:00.000Z";

  it("skips non-active subscriptions and ones with a missing or unparseable renewal date", () => {
    expect(getProjectedAnnual([
      sub({ id: "cancelled", status: "cancelled", nextRenewalDate: soon }),
      sub({ id: "no-date" }),
      sub({ id: "bad-date", nextRenewalDate: "junk" })
    ])).toBe(0);
  });

  it("a monthly plan is twelve charges, whatever the month", () => {
    const monthly = [sub({ id: "m", nextRenewalDate: soon, price: { amountMinor: 1549, currency: "USD" } })];
    expect(getProjectedAnnual(monthly)).toBeCloseTo(185.88, 9);
    vi.setSystemTime(new Date("2026-12-20T12:00:00.000Z"));
    expect(getProjectedAnnual(monthly)).toBeCloseTo(185.88, 9);
  });

  // F66's regression stays: every cycle by its monthly equivalent, not its raw price.
  it("projects quarterly and weekly plans by their monthly equivalent, not their raw price", () => {
    expect(getProjectedAnnual([sub({ id: "q", billingCycle: "quarterly", nextRenewalDate: soon, price: { amountMinor: 3000, currency: "USD" } })])).toBe(120);
    // weekly: round(500 × 52 / 12) = 2167 minor per month → $21.67 × 12.
    expect(getProjectedAnnual([sub({ id: "w", billingCycle: "weekly", nextRenewalDate: soon, price: { amountMinor: 500, currency: "USD" } })])).toBeCloseTo(260.04, 9);
  });

  it("projects nothing for an unknown cycle, which has no predictable charge", () => {
    expect(getProjectedAnnual([sub({ id: "u", billingCycle: "unknown", nextRenewalDate: soon, price: { amountMinor: 999, currency: "USD" } })])).toBe(0);
  });

  it("counts a yearly plan's charge, and a trial's conversion charge, once, whenever it falls", () => {
    expect(getProjectedAnnual([sub({ id: "a", billingCycle: "annual", nextRenewalDate: "2027-03-01T00:00:00.000Z", price: { amountMinor: 12000, currency: "USD" } })])).toBe(120);
    expect(getProjectedAnnual([sub({ id: "t", billingCycle: "trial", nextRenewalDate: soon, price: { amountMinor: 1200, currency: "USD" } })])).toBe(12);
    expect(getProjectedAnnual([sub({ id: "t", billingCycle: "trial", nextRenewalDate: "2027-01-10T09:00:00.000Z", price: { amountMinor: 1200, currency: "USD" } })])).toBe(12);
  });

  it("converts into the home currency, and excludes (never raw-sums) a currency with no rate", () => {
    const fx: FxContext = { homeCurrency: "USD", rates: { USD: 1, INR: 95 } };
    expect(getProjectedAnnual([
      sub({ id: "inr-monthly", nextRenewalDate: soon, price: { amountMinor: 9500, currency: "INR" } }), // $1 × 12
      sub({ id: "inr-annual", billingCycle: "annual", nextRenewalDate: "2026-09-01T09:00:00.000Z", price: { amountMinor: 190000, currency: "INR" } }), // $20
      sub({ id: "gbp-monthly", nextRenewalDate: soon, price: { amountMinor: 1000, currency: "GBP" } }),
      sub({ id: "gbp-annual", billingCycle: "annual", nextRenewalDate: "2026-09-01T09:00:00.000Z", price: { amountMinor: 1000, currency: "GBP" } })
    ], fx)).toBe(32);
  });

  it("is the same figure in every timezone", () => {
    vi.setSystemTime(new Date("2026-12-31T20:00:00.000Z")); // already 2027 in Kolkata
    const list = [
      sub({ id: "m", nextRenewalDate: "2027-01-01T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "a", billingCycle: "annual", nextRenewalDate: "2027-01-01T00:00:00.000Z", price: { amountMinor: 12000, currency: "USD" } })
    ];
    expect(inTimeZone("Asia/Kolkata", () => getProjectedAnnual(list))).toBe(240);
    expect(inTimeZone("America/Los_Angeles", () => getProjectedAnnual(list))).toBe(240);
  });
});
