import type { FxContext, Subscription, SubscriptionCategory } from "@zeno/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectAnnualSavings,
  detectCancellationReminders,
  detectDuplicates,
  detectHighSpend,
  detectTrialEnding,
  detectUnused,
  generateInsights,
  generateSpendSummary,
  getTotalSavingOpportunity,
  type Insight
} from "./insightsEngine";

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

const NOW = "2026-05-25T12:00:00.000Z";
/** An instant `offset` whole UTC days from NOW's UTC day, at `hour`:00 UTC. */
const utcDay = (offset: number, hour = 12) => new Date(Date.UTC(2026, 4, 25 + offset, hour)).toISOString();

type WithUsage = Subscription & { lastUsedDate?: string };

function sub(overrides: Partial<WithUsage> & { id: string }): WithUsage {
  return {
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
    name: overrides.id,
    category: "productivity",
    price: { amountMinor: 1200, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "profile_local",
    source: "manual",
    ...overrides
  };
}

const usd: FxContext = { homeCurrency: "USD", rates: { USD: 1, INR: 83 } };
const inrHome: FxContext = { homeCurrency: "INR", rates: { USD: 1, INR: 83 } };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("detectUnused", () => {
  it("flags only active/trial subscriptions whose last use is more than 30 whole days ago", () => {
    const insights = detectUnused([
      sub({ id: "thirty", lastUsedDate: utcDay(-30) }),
      sub({ id: "thirty-one", lastUsedDate: utcDay(-31) }),
      sub({ id: "trial-status", status: "trial", lastUsedDate: utcDay(-40) }),
      sub({ id: "cancelled", status: "cancelled", lastUsedDate: utcDay(-90) }),
      sub({ id: "never-tracked" }),
      sub({ id: "unparseable", lastUsedDate: "yesterday-ish" })
    ]);
    expect(insights.map((insight) => insight.subscriptionId)).toEqual(["trial-status", "thirty-one"]);
  });

  it("builds the message from the subscription's own price, and escalates past 60 days", () => {
    const [medium] = detectUnused([sub({ id: "m", name: "Notion", lastUsedDate: utcDay(-45) })]);
    expect(medium).toMatchObject({
      id: "unused-m",
      type: "unused",
      title: "Not used in 45 days",
      message: "Notion is $12/mo but you haven't opened it in 45 days. Still worth it?",
      savingAmount: 12,
      priority: "medium",
      actionLabel: "Cancel Subscription",
      actionRoute: "/subscription/cancel/m",
      createdAt: NOW
    });
    const [high] = detectUnused([sub({ id: "h", lastUsedDate: utcDay(-61) })]);
    expect(high?.priority).toBe("high");
    const [boundary] = detectUnused([sub({ id: "b", lastUsedDate: utcDay(-60) })]);
    expect(boundary?.priority).toBe("medium");
  });

  it("keeps the three longest-unused, most-stale first", () => {
    const insights = detectUnused([
      sub({ id: "d40", lastUsedDate: utcDay(-40) }),
      sub({ id: "d100", lastUsedDate: utcDay(-100) }),
      sub({ id: "d35", lastUsedDate: utcDay(-35) }),
      sub({ id: "d70", lastUsedDate: utcDay(-70) })
    ]);
    expect(insights.map((insight) => insight.subscriptionId)).toEqual(["d100", "d70", "d40"]);
  });

  // Regression: days were counted between LOCAL midnights. Across the US
  // spring-forward night a day is 23 hours, so 31 days came out as 30 and the
  // subscription was not flagged.
  it("counts whole UTC days, so a DST change does not lose one (New York, March 2026)", () => {
    vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"));
    const insights = inTimeZone("America/New_York", () => detectUnused([sub({ id: "x", lastUsedDate: "2026-02-17T12:00:00.000Z" })]));
    expect(insights.map((insight) => insight.title)).toEqual(["Not used in 31 days"]);
  });
});

describe("detectDuplicates", () => {
  it("ignores the catch-all 'other' category and categories with a single subscription", () => {
    expect(detectDuplicates([
      sub({ id: "o1", category: "other" }),
      sub({ id: "o2", category: "other" }),
      sub({ id: "solo", category: "health" }),
      sub({ id: "gone", category: "health", status: "cancelled" })
    ])).toEqual([]);
  });

  it("pairs the two biggest in a category, names both with their own prices, and marks it high when both exceed $10/mo", () => {
    const [insight] = detectDuplicates([
      sub({ id: "small", name: "Small", category: "health", price: { amountMinor: 500, currency: "USD" } }),
      sub({ id: "big", name: "Big", category: "health", price: { amountMinor: 3000, currency: "USD" } }),
      sub({ id: "mid", name: "Mid", category: "health", price: { amountMinor: 1150, currency: "USD" } })
    ]);
    expect(insight).toMatchObject({
      id: "duplicate-health-big-mid",
      title: "Two health tools",
      message: "You pay for both Big ($30) and Mid ($11.50). Could you replace one?",
      savingAmount: 11.5,
      subscriptionIds: ["big", "mid"],
      priority: "high"
    });
  });

  it("returns at most three pairs, largest saving first", () => {
    const pair = (category: SubscriptionCategory, amountMinor: number) => [
      sub({ id: `${category}-a`, category, price: { amountMinor, currency: "USD" } }),
      sub({ id: `${category}-b`, category, price: { amountMinor, currency: "USD" } })
    ];
    const insights = detectDuplicates([...pair("health", 500), ...pair("education", 4000), ...pair("finance", 900), ...pair("productivity", 2000)]);
    expect(insights.map((insight) => insight.savingAmount)).toEqual([40, 20, 9]);
  });

  it("ranks a pair with no computable saving after pairs that have one", () => {
    const insights = detectDuplicates([
      sub({ id: "g1", category: "education", price: { amountMinor: 5000, currency: "GBP" } }),
      sub({ id: "g2", category: "education", price: { amountMinor: 7000, currency: "GBP" } }),
      sub({ id: "u1", category: "health", price: { amountMinor: 900, currency: "USD" } }),
      sub({ id: "u2", category: "health", price: { amountMinor: 800, currency: "USD" } })
    ], usd);
    expect(insights.map((insight) => insight.savingAmount)).toEqual([8, undefined]);
    expect(insights[0]?.id).toBe("duplicate-health-u1-u2");
    // Two unconvertible amounts cannot be ranked against each other, so only
    // the category (not the member order) is asserted for the second pair.
    expect(insights[1]?.id).toMatch(/^duplicate-education-/);

    // Same result whichever category is seen first.
    const reversed = detectDuplicates([
      sub({ id: "u1", category: "health", price: { amountMinor: 900, currency: "USD" } }),
      sub({ id: "u2", category: "health", price: { amountMinor: 800, currency: "USD" } }),
      sub({ id: "g1", category: "education", price: { amountMinor: 5000, currency: "GBP" } }),
      sub({ id: "g2", category: "education", price: { amountMinor: 7000, currency: "GBP" } })
    ], usd);
    expect(reversed.map((insight) => insight.savingAmount)).toEqual([8, undefined]);
  });

  it("keeps an unconvertible pair but claims no saving and no high priority for it", () => {
    const [insight] = detectDuplicates([
      sub({ id: "g1", category: "education", price: { amountMinor: 5000, currency: "GBP" } }),
      sub({ id: "g2", category: "education", price: { amountMinor: 7000, currency: "GBP" } })
    ], usd);
    expect(insight?.savingAmount).toBeUndefined();
    expect(insight?.priority).toBe("medium");
    expect(insight?.subscriptionIds).toHaveLength(2);
  });

  // Regression: the title appended " tools" to a category already named
  // "… tools", producing "Two ai tools tools".
  it("names AI and developer tool categories without doubling 'tools'", () => {
    const titles = detectDuplicates([
      sub({ id: "a1", category: "ai_tools" }),
      sub({ id: "a2", category: "ai_tools" }),
      sub({ id: "d1", category: "developer_tools" }),
      sub({ id: "d2", category: "developer_tools" })
    ]).map((insight) => insight.title);
    expect(titles.sort()).toEqual(["Two AI tools", "Two developer tools"]);
  });

  // Regression: the "high" bar was a bare 10 compared against home-currency
  // amounts, i.e. $10 for a USD user but ₹10 (about 12 US cents) for an INR
  // user, so almost every INR duplicate was ranked "high".
  it("applies the $10/mo high-priority bar in the home currency", () => {
    const cheap = detectDuplicates([
      sub({ id: "c1", category: "health", price: { amountMinor: 20000, currency: "INR" } }), // ₹200 ≈ $2.41
      sub({ id: "c2", category: "health", price: { amountMinor: 30000, currency: "INR" } })  // ₹300 ≈ $3.61
    ], inrHome);
    expect(cheap[0]?.priority).toBe("medium");
    const dear = detectDuplicates([
      sub({ id: "e1", category: "health", price: { amountMinor: 90000, currency: "INR" } }), // ₹900 > ₹830
      sub({ id: "e2", category: "health", price: { amountMinor: 95000, currency: "INR" } })
    ], inrHome);
    expect(dear[0]?.priority).toBe("high");
  });

  it("claims no high priority when the $10 bar itself cannot be converted", () => {
    const noUsdRate: FxContext = { homeCurrency: "INR", rates: { INR: 83 } };
    const [insight] = detectDuplicates([
      sub({ id: "e1", category: "health", price: { amountMinor: 90000, currency: "INR" } }),
      sub({ id: "e2", category: "health", price: { amountMinor: 95000, currency: "INR" } })
    ], noUsdRate);
    expect(insight?.savingAmount).toBe(900);
    expect(insight?.priority).toBe("medium");
  });
});

describe("detectAnnualSavings", () => {
  // Catalog services with a default annual price: masterclass $120,
  // speechify $139, alltrails-pro $36, norton-360 $40 (all USD).
  it("computes the saving from the user's monthly price against the catalog's annual price", () => {
    const [insight] = detectAnnualSavings([sub({ id: "mc", name: "Masterclass", serviceSlug: "masterclass", price: { amountMinor: 1500, currency: "USD" } })]);
    expect(insight).toMatchObject({
      id: "annual-mc",
      type: "annual_saving",
      title: "Save $60/year on Masterclass",
      message: "Switching Masterclass to annual billing saves $60/year ($5/month).",
      savingAmount: 60,
      subscriptionId: "mc",
      priority: "high",
      actionLabel: "Switch to Annual",
      actionRoute: "/subscription/mc"
    });
  });

  it("marks savings of $50 or less as medium and ignores savings of $10 or less", () => {
    const [medium] = detectAnnualSavings([sub({ id: "m", serviceSlug: "masterclass", price: { amountMinor: 1200, currency: "USD" } })]); // 144 - 120 = 24
    expect(medium).toMatchObject({ savingAmount: 24, priority: "medium" });
    expect(detectAnnualSavings([sub({ id: "s", serviceSlug: "masterclass", price: { amountMinor: 1083, currency: "USD" } })])).toEqual([]); // 129.96 - 120
  });

  // The existing non-USD test uses Adobe, which has no catalog annual price, so
  // it returns before ever reaching the currency check. This one reaches it.
  it("skips a non-USD subscription even when its service has a (USD) annual price", () => {
    expect(detectAnnualSavings([sub({ id: "inr-mc", serviceSlug: "masterclass", price: { amountMinor: 150000, currency: "INR" } })])).toEqual([]);
  });

  it("finds the catalog service by serviceId as well as by slug", () => {
    expect(detectAnnualSavings([sub({ id: "by-id", serviceId: "masterclass", price: { amountMinor: 1500, currency: "USD" } })])).toHaveLength(1);
  });

  it("skips non-monthly plans, unknown services, and services without an annual price", () => {
    expect(detectAnnualSavings([
      sub({ id: "annual", billingCycle: "annual", serviceSlug: "masterclass", price: { amountMinor: 50000, currency: "USD" } }),
      sub({ id: "no-service", price: { amountMinor: 5000, currency: "USD" } }),
      sub({ id: "unknown-id", serviceId: "no-such-service", price: { amountMinor: 5000, currency: "USD" } }),
      sub({ id: "unknown-slug", serviceSlug: "no-such-service", price: { amountMinor: 5000, currency: "USD" } }),
      sub({ id: "no-annual-price", serviceSlug: "netflix", price: { amountMinor: 5000, currency: "USD" } }),
      sub({ id: "inactive", status: "paused", serviceSlug: "masterclass", price: { amountMinor: 5000, currency: "USD" } })
    ])).toEqual([]);
  });

  it("keeps the three largest savings, largest first", () => {
    const insights = detectAnnualSavings([
      sub({ id: "alltrails", serviceSlug: "alltrails-pro", price: { amountMinor: 500, currency: "USD" } }), // 60 - 36 = 24
      sub({ id: "speechify", serviceSlug: "speechify", price: { amountMinor: 2900, currency: "USD" } }), // 348 - 139 = 209
      sub({ id: "masterclass", serviceSlug: "masterclass", price: { amountMinor: 1500, currency: "USD" } }), // 60
      sub({ id: "norton", serviceSlug: "norton-360", price: { amountMinor: 1000, currency: "USD" } }) // 120 - 40 = 80
    ]);
    expect(insights.map((insight) => [insight.subscriptionId, insight.savingAmount])).toEqual([["speechify", 209], ["norton", 80], ["masterclass", 60]]);
  });
});

describe("detectTrialEnding", () => {
  const trial = (id: string, nextRenewalDate: string | undefined, extra: Partial<WithUsage> = {}) =>
    sub({ id, name: id, billingCycle: "trial", nextRenewalDate, price: { amountMinor: 1299, currency: "USD" }, ...extra });

  it("reports trials converting today through 7 days out, soonest first, high within 2 days", () => {
    const insights = detectTrialEnding([
      trial("d7", utcDay(7)),
      trial("d0", utcDay(0, 1)),
      trial("d3", utcDay(3)),
      trial("d2", utcDay(2)),
      trial("d8", utcDay(8)),
      trial("ended", utcDay(-1)),
      trial("no-date", undefined),
      trial("bad-date", "soon"),
      trial("cancelled", utcDay(1), { status: "cancelled" }),
      trial("paused", utcDay(1), { status: "paused" }),
      sub({ id: "not-a-trial", nextRenewalDate: utcDay(1) })
    ]);
    expect(insights.map((insight) => [insight.subscriptionId, insight.title, insight.priority])).toEqual([
      ["d0", "Trial ends in 0 days", "high"],
      ["d2", "Trial ends in 2 days", "high"],
      ["d3", "Trial ends in 3 days", "medium"],
      ["d7", "Trial ends in 7 days", "medium"]
    ]);
  });

  // Regression: the charge amount came from monthlyDollars(), which is 0 for
  // the "trial" cycle by definition — so every trial-ending insight told the
  // user they would be charged "$0".
  it("names the real amount the trial converts to, never $0", () => {
    const [insight] = detectTrialEnding([trial("Streamify", utcDay(2))]);
    expect(insight?.message).toMatch(/^Streamify free trial ends .+\. Cancel now to avoid being charged \$12\.99\.$/);
    expect(insight?.message).not.toContain("$0");
    expect(insight).toMatchObject({ actionLabel: "Cancel Before Charged", actionRoute: "/subscription/cancel/Streamify" });
  });

  it("does not invent an amount when the trial's price is unknown (0)", () => {
    const [insight] = detectTrialEnding([trial("Free", utcDay(2), { price: { amountMinor: 0, currency: "USD" } })]);
    expect(insight?.message).toMatch(/Cancel now to avoid being charged\.$/);
    expect(insight?.message).not.toContain("$0");
  });

  it("formats the charge in the trial's own currency", () => {
    const [insight] = detectTrialEnding([trial("Hotstar", utcDay(2), { price: { amountMinor: 29900, currency: "INR" } })]);
    expect(insight?.message).toContain("₹299");
  });

  // Regression: local-midnight arithmetic across the US fall-back night made
  // a 7-day gap 7 days + 1 hour, which Math.ceil turned into 8 — the trial
  // silently dropped out of the 7-day window (the shared Trial Guardian, which
  // counts UTC days, still said 7).
  it("counts whole UTC days, so a DST change does not push a 7-day trial out of the window (New York, Nov 2026)", () => {
    vi.setSystemTime(new Date("2026-10-30T12:00:00.000Z"));
    const insights = inTimeZone("America/New_York", () => detectTrialEnding([trial("x", "2026-11-06T12:00:00.000Z")]));
    expect(insights.map((insight) => insight.title)).toEqual(["Trial ends in 7 days"]);
  });
});

describe("detectHighSpend", () => {
  it("maps categories onto benchmark buckets, letting the catalog service's category win", () => {
    const insights = detectHighSpend([
      // entertainment + family → streaming ($25 benchmark): 20 + 20 = 40 > 37.5
      sub({ id: "ent", category: "entertainment", price: { amountMinor: 2000, currency: "USD" } }),
      sub({ id: "fam", category: "family", price: { amountMinor: 2000, currency: "USD" } }),
      // developer_tools → productivity ($40): 70 > 60
      sub({ id: "dev", category: "developer_tools", price: { amountMinor: 7000, currency: "USD" } })
    ]);
    expect(insights.map((insight) => [insight.id, insight.savingAmount, insight.subscriptionIds])).toEqual([
      ["high-spend-productivity", 30, ["dev"]],
      ["high-spend-streaming", 15, ["ent", "fam"]]
    ]);
  });

  it("uses the catalog category over the stored one, and buckets finance/other into 'other'", () => {
    const insights = detectHighSpend([
      // Stored as "other", but the catalog says netflix is streaming.
      sub({ id: "nf", category: "other", serviceSlug: "netflix", price: { amountMinor: 4000, currency: "USD" } }),
      // finance → other ($20): 35 > 30
      sub({ id: "fin", category: "finance", price: { amountMinor: 3500, currency: "USD" } })
    ]);
    expect(insights.map((insight) => insight.id).sort()).toEqual(["high-spend-other", "high-spend-streaming"]);
  });

  it("does not fire at exactly 1.5x the benchmark", () => {
    expect(detectHighSpend([sub({ id: "p", category: "productivity", price: { amountMinor: 6000, currency: "USD" } })])).toEqual([]);
  });

  it("keeps the two largest overages, largest first", () => {
    const insights = detectHighSpend([
      sub({ id: "p", category: "productivity", price: { amountMinor: 10000, currency: "USD" } }), // 100 - 40 = 60
      sub({ id: "h", category: "health", price: { amountMinor: 5000, currency: "USD" } }), // 50 - 30 = 20
      sub({ id: "e", category: "education", price: { amountMinor: 10000, currency: "USD" } }) // 100 - 25 = 75
    ]);
    expect(insights.map((insight) => insight.id)).toEqual(["high-spend-education", "high-spend-productivity"]);
  });

  // Regression: the message called the fixed benchmark constant an "Average",
  // a statistic nobody measured. It is Zeno's own reference figure.
  it("presents the benchmark as Zeno's benchmark, not as a measured average", () => {
    const [insight] = detectHighSpend([sub({ id: "p", category: "productivity", price: { amountMinor: 8000, currency: "USD" } })]);
    expect(insight).toMatchObject({
      title: "High spend on productivity",
      message: "You spend $80/mo on productivity tools. Zeno's benchmark for this category is $40/mo.",
      priority: "medium",
      actionLabel: "Review",
      actionRoute: "/analytics"
    });
    expect(insight?.message).not.toMatch(/average/i);
  });

  it("names the AI tools bucket without doubling 'tools'", () => {
    const [insight] = detectHighSpend([sub({ id: "ai", category: "ai_tools", price: { amountMinor: 6000, currency: "USD" } })]);
    expect(insight?.title).toBe("High spend on AI tools");
    expect(insight?.message).toContain("on AI tools.");
    expect(insight?.message).not.toContain("tools tools");
  });

  // Regression: when the USD benchmark could not be converted (the rate table
  // lacks the home currency), the raw USD figure was used AND printed with the
  // home currency's symbol — "₹40/mo" for what is really $40.
  it("skips the category rather than show an unconverted USD benchmark as a home-currency figure", () => {
    const noInrRate: FxContext = { homeCurrency: "INR", rates: { USD: 1 } };
    const insights = detectHighSpend([sub({ id: "inr", category: "productivity", price: { amountMinor: 500000, currency: "INR" } })], noInrRate);
    expect(insights).toEqual([]);
  });
});

describe("generateSpendSummary", () => {
  it("says so plainly when there are no active subscriptions", () => {
    const summary = generateSpendSummary([sub({ id: "gone", status: "cancelled" })]);
    expect(summary).toMatchObject({
      id: "spend-summary",
      type: "spend_summary",
      title: "Monthly overview",
      message: "You pay $0/mo across 0 subscriptions. No active subscriptions yet. 0 renewals this week.",
      priority: "low",
      actionLabel: "See breakdown",
      actionRoute: "/analytics"
    });
  });

  it("counts renewals from today through 7 UTC days out, ignoring missing, past and unparseable dates", () => {
    const summary = generateSpendSummary([
      sub({ id: "today", nextRenewalDate: utcDay(0, 1) }),
      sub({ id: "d7", nextRenewalDate: utcDay(7) }),
      sub({ id: "d8", nextRenewalDate: utcDay(8) }),
      sub({ id: "past", nextRenewalDate: utcDay(-1) }),
      sub({ id: "bad", nextRenewalDate: "whenever" }),
      sub({ id: "none" })
    ]);
    expect(summary.message).toMatch(/ 2 renewals this week\.$/);
  });

  it("names the biggest subscription and the leading category from the data", () => {
    const summary = generateSpendSummary([
      sub({ id: "a", name: "ChatGPT", category: "ai_tools", price: { amountMinor: 2000, currency: "USD" } }),
      sub({ id: "b", name: "Claude", category: "ai_tools", price: { amountMinor: 1800, currency: "USD" } }),
      sub({ id: "c", name: "Figma", category: "productivity", price: { amountMinor: 2500, currency: "USD" } })
    ]);
    expect(summary.message).toBe("You pay $63/mo across 3 subscriptions. Figma is your biggest at $25/mo. AI tools leads your category spend. 0 renewals this week.");
  });
});

describe("detectCancellationReminders", () => {
  it("reminds about cancelled subscriptions whose access runs today or later, soonest first, at most two", () => {
    const insights = detectCancellationReminders([
      sub({ id: "d5", status: "cancelled", nextRenewalDate: utcDay(5) }),
      sub({ id: "d0", status: "cancelled", nextRenewalDate: utcDay(0, 1) }),
      sub({ id: "d2", status: "cancelled", nextRenewalDate: utcDay(2) }),
      sub({ id: "ended", status: "cancelled", nextRenewalDate: utcDay(-1) }),
      sub({ id: "no-date", status: "cancelled" }),
      sub({ id: "active", nextRenewalDate: utcDay(1) })
    ]);
    expect(insights.map((insight) => insight.subscriptionId)).toEqual(["d0", "d2"]);
  });

  it("states the access end date and the monthly amount saved", () => {
    const [insight] = detectCancellationReminders([sub({ id: "x", name: "Hulu", status: "cancelled", nextRenewalDate: utcDay(3), price: { amountMinor: 799, currency: "USD" } })]);
    expect(insight?.title).toMatch(/^Hulu cancelled - active until .+$/);
    expect(insight?.title).not.toContain("the renewal date");
    expect(insight?.message).toMatch(/^Your access continues until .+\. After that you save \$7\.99\/mo\.$/);
    expect(insight).toMatchObject({ type: "cancellation_reminder", savingAmount: 7.99, priority: "low", id: "cancel-reminder-x" });
  });

  it("claims no saving when the cancelled subscription's currency has no rate", () => {
    const [insight] = detectCancellationReminders([sub({ id: "gbp", status: "cancelled", nextRenewalDate: utcDay(3), price: { amountMinor: 999, currency: "GBP" } })], usd);
    expect(insight?.savingAmount).toBeUndefined();
    expect(insight?.message).toContain("£9.99/mo");
  });

  // Regression: an unparseable date made daysUntil() return +Infinity, which
  // passed the ">= 0" test, so the user was told their access "continues until
  // the renewal date" — a date the app does not actually know.
  it("gives no reminder for a cancelled subscription whose end date is unparseable", () => {
    expect(detectCancellationReminders([sub({ id: "x", status: "cancelled", nextRenewalDate: "not-a-date" })])).toEqual([]);
  });
});

describe("generateInsights", () => {
  it("lets each subscription appear in only one insight, keeping the one ranked first", () => {
    // "a" is long-unused (high, saving $30), half of a high-priority duplicate
    // pair (saving $25) and part of a medium high-spend insight. The unused
    // insight ranks first, so the other two, which also name "a", are dropped.
    const insights = generateInsights([
      sub({ id: "a", category: "health", price: { amountMinor: 3000, currency: "USD" }, lastUsedDate: utcDay(-90) }),
      sub({ id: "b", category: "health", price: { amountMinor: 2500, currency: "USD" } })
    ]);
    expect(insights.map((insight) => insight.type)).toEqual(["unused", "spend_summary"]);
  });

  it("orders by priority, then saving, then title", () => {
    const insights = generateInsights([
      sub({ id: "t5", billingCycle: "trial", nextRenewalDate: utcDay(5), price: { amountMinor: 900, currency: "USD" } }),
      sub({ id: "t3", billingCycle: "trial", nextRenewalDate: utcDay(3), price: { amountMinor: 900, currency: "USD" } }),
      sub({ id: "t1", billingCycle: "trial", nextRenewalDate: utcDay(1), price: { amountMinor: 900, currency: "USD" } }),
      sub({ id: "gone", status: "cancelled", nextRenewalDate: utcDay(4), price: { amountMinor: 900, currency: "USD" } })
    ]);
    expect(insights.map((insight) => insight.subscriptionId ?? insight.type)).toEqual(["t1", "t3", "t5", "gone", "spend_summary"]);
  });

  it("returns at most 8 insights and drops the summary when 8 real insights exist", () => {
    const trials = Array.from({ length: 9 }, (_, index) => sub({ id: `t${index}`, billingCycle: "trial", nextRenewalDate: utcDay(1) }));
    const insights = generateInsights(trials);
    expect(insights).toHaveLength(8);
    expect(insights.every((insight) => insight.type === "trial_ending")).toBe(true);
  });

  it("appends the summary last when fewer than 8 insights exist", () => {
    const insights = generateInsights([sub({ id: "t", billingCycle: "trial", nextRenewalDate: utcDay(1) })]);
    expect(insights.map((insight) => insight.type)).toEqual(["trial_ending", "spend_summary"]);
  });
});

describe("getTotalSavingOpportunity", () => {
  const insight = (savingAmount?: number): Insight => ({ id: "i", type: "unused", title: "t", message: "m", priority: "low", createdAt: NOW, savingAmount });

  it("sums savings, treating a missing saving as none, and rounds to cents", () => {
    expect(getTotalSavingOpportunity([insight(0.1), insight(0.2), insight(undefined)])).toBe(0.3);
    expect(getTotalSavingOpportunity([])).toBe(0);
  });
});
