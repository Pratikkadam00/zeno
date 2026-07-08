import type { ExchangeRates, FxContext, Subscription } from "@zeno/shared";
import { describe, expect, it } from "vitest";
import { detectAnnualSavings, detectCancellationReminders, detectDuplicates, detectHighSpend, detectTrialEnding, detectUnused, generateInsights, generateSpendSummary, getTotalSavingOpportunity } from "./insightsEngine";

const now = "2026-05-25T00:00:00.000Z";

function subscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: overrides.id ?? "sub_test",
    createdAt: now,
    updatedAt: now,
    version: 1,
    name: overrides.name ?? "Test",
    category: overrides.category ?? "productivity",
    price: overrides.price ?? { amountMinor: 1200, currency: "USD" },
    billingCycle: overrides.billingCycle ?? "monthly",
    nextRenewalDate: overrides.nextRenewalDate,
    status: overrides.status ?? "active",
    ownerProfileId: "profile_local",
    source: overrides.source ?? "manual",
    serviceSlug: overrides.serviceSlug,
    serviceId: overrides.serviceId
  };
}

describe("insightsEngine", () => {
  it("detects duplicate active subscriptions in the same category", () => {
    const insights = detectDuplicates([
      subscription({ id: "one", name: "Notion", category: "productivity", price: { amountMinor: 1000, currency: "USD" } }),
      subscription({ id: "two", name: "Linear", category: "productivity", price: { amountMinor: 1200, currency: "USD" } })
    ]);

    expect(insights[0]).toMatchObject({
      type: "duplicate",
      savingAmount: 10,
      subscriptionIds: ["two", "one"],
      actionRoute: "/analytics"
    });
  });

  it("combines insights, deduplicates subscription ids, and includes summary last", () => {
    const insights = generateInsights([
      subscription({ id: "adobe", name: "Adobe Creative Cloud", category: "productivity", serviceSlug: "adobe-creative-cloud", price: { amountMinor: 5499, currency: "USD" } }),
      subscription({ id: "figma", name: "Figma", category: "productivity", serviceSlug: "figma", price: { amountMinor: 1500, currency: "USD" } }),
      subscription({ id: "netflix", name: "Netflix", category: "entertainment", serviceSlug: "netflix", price: { amountMinor: 1549, currency: "USD" } })
    ]);

    expect(insights.length).toBeGreaterThan(1);
    expect(insights.at(-1)?.type).toBe("spend_summary");
    expect(getTotalSavingOpportunity(insights)).toBeGreaterThan(0);
  });

  // Regression: detectTrialEnding used to check isTrial/trialEndDate fields the
  // real Subscription model never populates, so this insight could never fire.
  it("detects a trial ending soon via billingCycle/nextRenewalDate", () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const insights = detectTrialEnding([
      subscription({ id: "trial-soon", name: "Streamify", billingCycle: "trial", nextRenewalDate: soon })
    ]);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toMatchObject({ type: "trial_ending", subscriptionId: "trial-soon", priority: "high" });
  });

  it("does not flag a cancelled trial or one converting far in the future", () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const insights = detectTrialEnding([
      subscription({ id: "cancelled-trial", billingCycle: "trial", nextRenewalDate: soon, status: "cancelled" }),
      subscription({ id: "far-off-trial", billingCycle: "trial", nextRenewalDate: farFuture })
    ]);
    expect(insights).toHaveLength(0);
  });

  // Currency honesty: a non-USD subscription's insight message must reflect its
  // real currency, never silently default to "$".
  it("labels an unused-subscription insight with the subscription's own currency, not a hardcoded $", () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const insights = detectUnused([
      { ...subscription({ id: "inr-unused", name: "StreamIN", price: { amountMinor: 49900, currency: "INR" } }), lastUsedDate: staleDate } as Subscription & { lastUsedDate: string }
    ]);
    expect(insights).toHaveLength(1);
    expect(insights[0]?.message).toContain("₹499");
    expect(insights[0]?.message).not.toContain("$499");
  });

  it("duplicate-category insight labels each subscription with its own currency when they differ", () => {
    const insights = detectDuplicates([
      subscription({ id: "us-one", name: "Notion", category: "productivity", price: { amountMinor: 1000, currency: "USD" } }),
      subscription({ id: "in-two", name: "Craft", category: "productivity", price: { amountMinor: 120000, currency: "INR" } })
    ]);
    expect(insights[0]?.message).toContain("$10");
    expect(insights[0]?.message).toContain("₹1200");
  });

  // The service catalog's default prices are USD-only (no currency field), so
  // comparing them against a non-USD subscription would produce a meaningless
  // "saving" figure — detectAnnualSavings must skip rather than fabricate one.
  it("skips the annual-savings insight for a non-USD subscription matched to a catalog service", () => {
    const insights = detectAnnualSavings([
      subscription({
        id: "inr-adobe",
        name: "Adobe Creative Cloud",
        category: "productivity",
        serviceSlug: "adobe-creative-cloud",
        billingCycle: "monthly",
        price: { amountMinor: 549900, currency: "INR" }
      })
    ]);
    expect(insights).toHaveLength(0);
  });
});

// Phase 5.2 gap fix: insightsEngine.ts is a separate, mobile-local insight
// engine (duplicates some of packages/shared/src/spend/coach.ts's logic) whose
// savingAmount/aggregate math was not made fx-aware when the rest of the app
// got real FX conversion — it kept summing/comparing raw minor units across
// currencies. These tests cover the fix: every function below now accepts an
// optional trailing fx?: FxContext, defaults to the exact legacy (unconverted)
// behavior when omitted, and excludes (never fabricates) a subscription whose
// currency has no usable rate.
const rates: ExchangeRates = { USD: 1, INR: 83 };
const fx: FxContext = { homeCurrency: "USD", rates };

describe("insightsEngine — FX conversion (Phase 5.2 gap fix)", () => {
  it("detectUnused: converts savingAmount into home currency, keeping the message in the subscription's own currency", () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const insights = detectUnused([
      { ...subscription({ id: "inr-unused", name: "StreamIN", price: { amountMinor: 83000, currency: "INR" } }), lastUsedDate: staleDate } as Subscription & { lastUsedDate: string }
    ], fx);
    expect(insights).toHaveLength(1);
    // ₹830 -> $10 at the fx rate above.
    expect(insights[0]?.savingAmount).toBe(10);
    expect(insights[0]?.message).toContain("₹830");
    expect(insights[0]?.message).not.toContain("$830");
  });

  it("detectUnused: excludes (undefined, never fabricates) savingAmount when the subscription's currency has no rate", () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const insights = detectUnused([
      { ...subscription({ id: "gbp-unused", name: "StreamGB", price: { amountMinor: 1000, currency: "GBP" } }), lastUsedDate: staleDate } as Subscription & { lastUsedDate: string }
    ], fx);
    expect(insights).toHaveLength(1);
    expect(insights[0]?.savingAmount).toBeUndefined();
  });

  it("detectDuplicates: ranks by fx-converted amount, not raw minor units, when currencies differ", () => {
    // Raw minor units would misrank these: INR's raw amountMinor (83000) is
    // numerically bigger than USD's (5000), but converted at the fx rate above
    // ($10 vs $50) USD is actually the bigger spend.
    const insights = detectDuplicates([
      subscription({ id: "inr-sub", name: "Craft", category: "productivity", price: { amountMinor: 83000, currency: "INR" } }),
      subscription({ id: "usd-sub", name: "Notion", category: "productivity", price: { amountMinor: 5000, currency: "USD" } })
    ], fx);
    expect(insights).toHaveLength(1);
    // Math.min of the two CONVERTED amounts ($50, $10) is 10, not the naive
    // Math.min of native-unit numbers (5000/100=50 vs 83000/100=830 -> would be 50).
    expect(insights[0]?.savingAmount).toBe(10);
    // priority uses the converted amounts too: $50 > 10, but $10 is not > 10.
    expect(insights[0]?.priority).toBe("medium");
  });

  it("detectDuplicates: with fx omitted, ranking and savingAmount are byte-for-byte identical to legacy (no-conversion) behavior", () => {
    const withFx = detectDuplicates([
      subscription({ id: "one", name: "Notion", category: "productivity", price: { amountMinor: 1000, currency: "USD" } }),
      subscription({ id: "two", name: "Linear", category: "productivity", price: { amountMinor: 1200, currency: "USD" } })
    ]);
    // Exact same assertion as the pre-existing "detects duplicate active
    // subscriptions" test above — confirms omitting fx changes nothing.
    expect(withFx[0]).toMatchObject({ type: "duplicate", savingAmount: 10, subscriptionIds: ["two", "one"] });
  });

  it("detectDuplicates: excludes the pair (savingAmount undefined) when either subscription's currency has no rate", () => {
    const insights = detectDuplicates([
      subscription({ id: "usd-sub", name: "Notion", category: "productivity", price: { amountMinor: 5000, currency: "USD" } }),
      subscription({ id: "gbp-sub", name: "Craft", category: "productivity", price: { amountMinor: 3000, currency: "GBP" } })
    ], fx);
    expect(insights).toHaveLength(1);
    expect(insights[0]?.savingAmount).toBeUndefined();
  });

  it("detectHighSpend: sums a category's spend across currencies via fx conversion, not a raw mixed-currency sum", () => {
    const insights = detectHighSpend([
      subscription({ id: "usd-tool", name: "Adobe", category: "productivity", price: { amountMinor: 5000, currency: "USD" } }),
      subscription({ id: "inr-tool", name: "Figma India", category: "productivity", price: { amountMinor: 249000, currency: "INR" } })
    ], fx);
    // $50 + (₹2490 -> $30) = $80 category spend; benchmark is $40, so $80 > 40*1.5=60 triggers.
    // A naive raw sum would be 50 + 2490 = 2540 (nonsensical, would also trigger
    // but with a wildly wrong number) or, un-normalized, could misclassify entirely.
    expect(insights).toHaveLength(1);
    expect(insights[0]?.message).toContain("$80");
    expect(insights[0]?.message).not.toContain("$2540");
    expect(insights[0]?.savingAmount).toBe(40); // 80 - benchmark(40)
  });

  it("detectHighSpend: excludes a category member whose currency has no rate from the category sum", () => {
    const insights = detectHighSpend([
      subscription({ id: "usd-tool", name: "Adobe", category: "productivity", price: { amountMinor: 5000, currency: "USD" } }),
      subscription({ id: "gbp-tool", name: "Craft", category: "productivity", price: { amountMinor: 900000, currency: "GBP" } })
    ], fx);
    // Only the $50 USD tool counts; $50 <= 40*1.5=60, so no insight fires at all —
    // if the GBP amount were wrongly folded in raw, this would very much fire.
    expect(insights).toHaveLength(0);
  });

  // Regression: an adversarial review of this fix found that detectHighSpend
  // converted `spend` into fx.homeCurrency but left categoryBenchmarks (fixed
  // USD-scale constants) unconverted, so a non-USD homeCurrency compared an
  // apples (home-currency spend) to oranges (USD-scale constant) figure — a
  // user on INR (~83:1) would get a false "high spend" alert for completely
  // ordinary spend, with a nonsensical, wildly inflated savingAmount.
  const fxInr: FxContext = { homeCurrency: "INR", rates };

  it("detectHighSpend: converts the USD-denominated benchmark into a non-USD home currency before comparing — does not fire for ordinary spend", () => {
    const insights = detectHighSpend([
      // ₹3320/mo is exactly the productivity benchmark (40 USD) converted at
      // 83 INR/USD — ordinary spend, not "high" by any reasonable definition.
      subscription({ id: "inr-tool", name: "Notion India", category: "productivity", price: { amountMinor: 332000, currency: "INR" } })
    ], fxInr);
    expect(insights).toHaveLength(0);
  });

  it("detectHighSpend: still fires correctly for genuinely high spend in a non-USD home currency, with a sanely-scaled savingAmount", () => {
    const insights = detectHighSpend([
      // ₹5000/mo, well above the converted ₹3320 * 1.5 = ₹4980 threshold.
      subscription({ id: "inr-tool", name: "Notion India", category: "productivity", price: { amountMinor: 500000, currency: "INR" } })
    ], fxInr);
    expect(insights).toHaveLength(1);
    expect(insights[0]?.message).toContain("₹5000");
    expect(insights[0]?.message).toContain("₹3320");
    // Not the nonsensical 5000 - 40 = 4960 a pre-fix implementation would produce.
    expect(insights[0]?.savingAmount).toBe(1680);
  });

  it("generateSpendSummary: totals and 'biggest subscription' selection use fx-converted amounts", () => {
    const summary = generateSpendSummary([
      subscription({ id: "inr-sub", name: "CraftIN", price: { amountMinor: 249000, currency: "INR" } }), // -> $30
      subscription({ id: "usd-sub", name: "Notion", price: { amountMinor: 5000, currency: "USD" } })      // $50
    ], fx);
    // Total: 30 + 50 = 80. Raw/native sum (as a naive pre-fix implementation
    // would compute) would be 2490 + 50 = 2540 — nowhere close.
    expect(summary.message).toContain("$80");
    // USD sub is the real "biggest" ($50 > $30 converted) even though INR's raw
    // minor units (249000) dwarf USD's (5000) — legacy raw-ranking would have
    // picked the INR one instead.
    expect(summary.message).toContain("Notion is your biggest");
    expect(summary.message).not.toContain("CraftIN is your biggest");
  });

  it("generateSpendSummary: surfaces excluded-currency subscriptions honestly instead of silently dropping or mis-summing them", () => {
    const summary = generateSpendSummary([
      subscription({ id: "usd-sub", name: "Notion", price: { amountMinor: 5000, currency: "USD" } }),
      subscription({ id: "gbp-sub", name: "Craft", price: { amountMinor: 3000, currency: "GBP" } })
    ], fx);
    expect(summary.message).toContain("$50");
    expect(summary.message).toContain("across 1 subscriptions");
    expect(summary.message).toContain("1 more excluded");
  });

  it("generateSpendSummary: with fx omitted, output is unchanged from legacy behavior", () => {
    const summary = generateSpendSummary([
      subscription({ id: "adobe", name: "Adobe Creative Cloud", category: "productivity", serviceSlug: "adobe-creative-cloud", price: { amountMinor: 5499, currency: "USD" } }),
      subscription({ id: "figma", name: "Figma", category: "productivity", serviceSlug: "figma", price: { amountMinor: 1500, currency: "USD" } })
    ]);
    expect(summary.message).toContain("across 2 subscriptions");
    expect(summary.message).not.toContain("excluded");
  });

  it("detectCancellationReminders: converts savingAmount into home currency", () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const insights = detectCancellationReminders([
      subscription({ id: "cancelled-inr", name: "StreamIN", status: "cancelled", nextRenewalDate: soon, price: { amountMinor: 83000, currency: "INR" } })
    ], fx);
    expect(insights).toHaveLength(1);
    expect(insights[0]?.savingAmount).toBe(10);
  });

  it("getTotalSavingOpportunity: end-to-end via generateInsights(subscriptions, fx) sums fx-converted amounts, not a mixed-currency raw sum", () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const insights = generateInsights([
      { ...subscription({ id: "usd-unused", name: "USD Unused", price: { amountMinor: 2000, currency: "USD" } }), lastUsedDate: staleDate } as Subscription & { lastUsedDate: string },
      { ...subscription({ id: "inr-unused", name: "INR Unused", price: { amountMinor: 83000, currency: "INR" } }), lastUsedDate: staleDate } as Subscription & { lastUsedDate: string }
    ], fx);
    // $20 (native) + (₹830 -> $10 converted) = $30. A pre-fix implementation
    // summing raw native-unit numbers would produce 20 + 830 = 850.
    expect(getTotalSavingOpportunity(insights)).toBe(30);
  });

  it("generateInsights/getTotalSavingOpportunity: with fx omitted, matches the pre-existing mixed-fixture regression test exactly", () => {
    const insights = generateInsights([
      subscription({ id: "adobe", name: "Adobe Creative Cloud", category: "productivity", serviceSlug: "adobe-creative-cloud", price: { amountMinor: 5499, currency: "USD" } }),
      subscription({ id: "figma", name: "Figma", category: "productivity", serviceSlug: "figma", price: { amountMinor: 1500, currency: "USD" } }),
      subscription({ id: "netflix", name: "Netflix", category: "entertainment", serviceSlug: "netflix", price: { amountMinor: 1549, currency: "USD" } })
    ]);
    expect(insights.length).toBeGreaterThan(1);
    expect(insights.at(-1)?.type).toBe("spend_summary");
    expect(getTotalSavingOpportunity(insights)).toBeGreaterThan(0);
  });
});

