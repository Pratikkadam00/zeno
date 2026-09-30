import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createSpendSummary, type ExchangeRates, type SpendInsight } from "./coach";

// USD-pivot table (units of each currency per 1 USD).
const rates: ExchangeRates = { USD: 1, INR: 95 };
const NOW = new Date("2026-09-30T12:00:00.000Z");

function sub(input: Partial<Subscription> & Pick<Subscription, "id" | "category" | "price">): Subscription {
  return {
    name: input.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...input
  };
}

const usd = (amountMinor: number) => ({ amountMinor, currency: "USD" as const });
const inr = (amountMinor: number) => ({ amountMinor, currency: "INR" as const });
const ofKind = (insights: SpendInsight[], kind: SpendInsight["kind"]) => insights.filter((insight) => insight.kind === kind);

describe("createSpendSummary — totals", () => {
  it("counts only active subscriptions and sorts categories by spend", () => {
    const summary = createSpendSummary([
      sub({ id: "a", category: "health", price: usd(500) }),
      sub({ id: "b", category: "education", price: usd(900) }),
      sub({ id: "c", category: "education", price: usd(9999), status: "cancelled" })
    ], NOW);
    expect(summary.totalMonthlyMinor).toBe(1400);
    expect(summary.byCategory).toEqual([
      { category: "education", monthlyMinor: 900, count: 1 },
      { category: "health", monthlyMinor: 500, count: 1 }
    ]);
  });
});

describe("category benchmark insight — currency honesty", () => {
  it("keeps the USD wording and figures for an all-USD portfolio without fx", () => {
    const [insight] = ofKind(createSpendSummary([sub({ id: "a", category: "ai_tools", price: usd(5000) })], NOW).insights, "category_over_budget");
    expect(insight?.body).toBe("You spend $50.00 per month; the profile benchmark is $34.00.");
    expect(insight?.estimatedMonthlyImpactMinor).toBe(1600);
    expect(insight?.subscriptionIds).toEqual(["a"]);
  });

  it("does not flag a category that has no benchmark, or one at/below it", () => {
    const summary = createSpendSummary([
      sub({ id: "o", category: "other", price: usd(99999) }),
      sub({ id: "e", category: "entertainment", price: usd(4500) })
    ], NOW);
    expect(ofKind(summary.insights, "category_over_budget")).toEqual([]);
  });

  it("converts the USD benchmark into the home currency before comparing (fx path)", () => {
    // ₹1,500/month against a $34 benchmark = ₹3,230: NOT over budget.
    // Before the fix the raw 3400 was read as paise (₹34), so it was flagged
    // and the body claimed "the profile benchmark is ₹34.00".
    const summary = createSpendSummary([sub({ id: "a", category: "ai_tools", price: inr(150000) })], NOW, { homeCurrency: "INR", rates });
    expect(ofKind(summary.insights, "category_over_budget")).toEqual([]);
  });

  it("states the converted benchmark and overage when the home-currency spend IS over it", () => {
    const summary = createSpendSummary([sub({ id: "a", category: "ai_tools", price: inr(400000) })], NOW, { homeCurrency: "INR", rates });
    const [insight] = ofKind(summary.insights, "category_over_budget");
    expect(insight?.body).toBe("You spend ₹4,000.00 per month; the profile benchmark is ₹3,230.00.");
    expect(insight?.estimatedMonthlyImpactMinor).toBe(400000 - 323000);
  });

  it("skips the benchmark when the rate table cannot convert USD into the home currency", () => {
    const summary = createSpendSummary([sub({ id: "a", category: "ai_tools", price: inr(400000) })], NOW, { homeCurrency: "INR", rates: { USD: 1 } });
    expect(summary.totalMonthlyMinor).toBe(400000); // same-currency spend still counts
    expect(ofKind(summary.insights, "category_over_budget")).toEqual([]);
  });

  it("skips the benchmark without fx when the spend is not in USD (no rate to compare with)", () => {
    // Before the fix: "You spend $5,000.00 per month; the profile benchmark is
    // $34.00." for ₹5,000 of spend.
    const summary = createSpendSummary([sub({ id: "a", category: "ai_tools", price: inr(500000) })], NOW);
    expect(ofKind(summary.insights, "category_over_budget")).toEqual([]);
  });

  it("skips the benchmark without fx when currencies are mixed (the raw sum has no single unit)", () => {
    const summary = createSpendSummary([
      sub({ id: "u", category: "ai_tools", price: usd(3000) }),
      sub({ id: "i", category: "ai_tools", price: inr(95000) })
    ], NOW);
    expect(ofKind(summary.insights, "category_over_budget")).toEqual([]);
  });

  it("ignores a zero-cost (trial) subscription's currency when deciding if the portfolio is single-currency", () => {
    const summary = createSpendSummary([
      sub({ id: "u", category: "ai_tools", price: usd(5000) }),
      sub({ id: "t", category: "health", price: inr(0), billingCycle: "trial" })
    ], NOW);
    expect(ofKind(summary.insights, "category_over_budget")).toHaveLength(1);
  });
});

describe("spend twin insight — currency honesty", () => {
  it("counts $10 burritos for USD spend", () => {
    const [insight] = ofKind(createSpendSummary([sub({ id: "a", category: "other", price: usd(2500) })], NOW).insights, "spend_twin");
    expect(insight?.body).toBe("Your subscriptions equal about 3 burritos, a weekend flight fund, or a month of gym membership.");
  });

  it("prices the burrito in the home currency via the rate table", () => {
    const summary = createSpendSummary([sub({ id: "a", category: "other", price: inr(190000) })], NOW, { homeCurrency: "INR", rates });
    expect(ofKind(summary.insights, "spend_twin")[0]?.body).toContain("about 2 burritos");
  });

  it("gives no burrito count when no rate prices the burrito in the home currency", () => {
    // Before the fix a missing rate fell back to 1000 paise (₹10): 190 burritos.
    const summary = createSpendSummary([sub({ id: "a", category: "other", price: inr(190000) })], NOW, { homeCurrency: "INR", rates: { USD: 1 } });
    expect(ofKind(summary.insights, "spend_twin")).toEqual([]);
  });

  it("gives no burrito count without fx for non-USD or mixed-currency spend", () => {
    expect(ofKind(createSpendSummary([sub({ id: "a", category: "other", price: inr(190000) })], NOW).insights, "spend_twin")).toEqual([]);
    const mixed = createSpendSummary([
      sub({ id: "u", category: "other", price: usd(1000) }),
      sub({ id: "i", category: "other", price: inr(190000) })
    ], NOW);
    expect(ofKind(mixed.insights, "spend_twin")).toEqual([]);
  });

  it("gives no burrito count when there is no recurring spend", () => {
    const summary = createSpendSummary([sub({ id: "t", category: "other", price: usd(999), billingCycle: "trial" })], NOW);
    expect(ofKind(summary.insights, "spend_twin")).toEqual([]);
  });
});

describe("duplicate-category insight", () => {
  it("flags three or more in an overlap-prone category only", () => {
    const three = (category: Subscription["category"]) => ["x", "y", "z"].map((id) => sub({ id: `${category}-${id}`, category, price: usd(100) }));
    const summary = createSpendSummary([...three("entertainment"), ...three("health")], NOW);
    const duplicates = ofKind(summary.insights, "duplicate_category");
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.title).toBe("Review overlap in Entertainment");
    expect(duplicates[0]?.subscriptionIds).toEqual(["entertainment-x", "entertainment-y", "entertainment-z"]);
  });
});

describe("annual-savings insight", () => {
  it("estimates 18% of a monthly price in the subscription's OWN currency", () => {
    const summary = createSpendSummary([sub({ id: "inr", name: "Hotstar", category: "entertainment", price: inr(29900) })], NOW);
    const [insight] = ofKind(summary.insights, "annual_savings");
    expect(insight?.estimatedMonthlyImpactMinor).toBe(Math.round(29900 * 0.18));
    expect(insight?.body).toBe("If annual billing saves 18%, this could reduce spend by about ₹53.82 per month.");
    expect(insight?.title).toBe("Check annual pricing for Hotstar");
  });

  it("skips non-monthly and small subscriptions, and caps the list at four", () => {
    const eligible = ["a", "b", "c", "d", "e"].map((id) => sub({ id, category: "other", price: usd(1000) }));
    const summary = createSpendSummary([
      ...eligible,
      sub({ id: "annual", category: "other", price: usd(12000), billingCycle: "annual" }),
      sub({ id: "small", category: "other", price: usd(999) })
    ], NOW);
    expect(ofKind(summary.insights, "annual_savings").map((insight) => insight.subscriptionIds[0])).toEqual(["a", "b", "c", "d"]);
  });
});

describe("unused-review insight", () => {
  const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

  it("asks to confirm value once the last charge is 30+ days old", () => {
    const summary = createSpendSummary([sub({ id: "old", name: "Old", category: "other", price: usd(500), lastChargedDate: daysAgo(45) })], NOW);
    const [insight] = ofKind(summary.insights, "unused_review");
    expect(insight?.body).toBe("No recent value signal is available and the last charge is 45 days old.");
    expect(insight?.title).toBe("Confirm value for Old");
  });

  it("stays quiet for a recent charge, a high-value rating, or no charge date", () => {
    const summary = createSpendSummary([
      sub({ id: "recent", category: "other", price: usd(500), lastChargedDate: daysAgo(29) }),
      sub({ id: "loved", category: "other", price: usd(500), lastChargedDate: daysAgo(90), valueRating: "high" }),
      sub({ id: "never", category: "other", price: usd(500) })
    ], NOW);
    expect(ofKind(summary.insights, "unused_review")).toEqual([]);
  });

  it("stays quiet when the last-charge date cannot be parsed (no \"NaN days old\")", () => {
    const summary = createSpendSummary([sub({ id: "bad", category: "other", price: usd(500), lastChargedDate: "not a date" })], NOW);
    expect(ofKind(summary.insights, "unused_review")).toEqual([]);
  });
});
