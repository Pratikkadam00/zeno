import { describe, expect, it } from "vitest";
import type { Subscription, SubscriptionCategory } from "../domain";
import { createSpendSummary, type SpendInsight } from "./coach";

// Each insight the coach screen shows, pinned whole: its kind, severity, title,
// body, the subscriptions it names and its estimate. P6.1: Stryker changed each
// of these (a severity, a threshold, the currency rule) and no test noticed.

const NOW = new Date("2026-09-30T12:00:00.000Z");

function sub(input: Partial<Subscription> & Pick<Subscription, "id">): Subscription {
  return {
    name: input.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    category: "other",
    price: { amountMinor: 500, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...input
  };
}
const usd = (amountMinor: number) => ({ amountMinor, currency: "USD" as const });
const inr = (amountMinor: number) => ({ amountMinor, currency: "INR" as const });
const kinds = (insights: SpendInsight[]) => insights.map((insight) => insight.kind);
const ofKind = (insights: SpendInsight[], kind: SpendInsight["kind"]) => insights.filter((insight) => insight.kind === kind);

describe("createSpendSummary — insights without exchange rates", () => {
  it("one currency: the totals are in it, so the benchmark and the Spend Twin speak in it", () => {
    const { insights } = createSpendSummary([
      sub({ id: "e1", category: "entertainment", price: usd(3000) }),
      sub({ id: "e2", category: "entertainment", price: usd(3000) })
    ], NOW);
    expect(insights).toEqual([
      {
        kind: "category_over_budget",
        severity: "warning",
        title: "Entertainment is above profile benchmark",
        body: "You spend $60.00 per month; the profile benchmark is $45.00.",
        subscriptionIds: ["e1", "e2"],
        estimatedMonthlyImpactMinor: 1500
      },
      {
        kind: "annual_savings",
        severity: "opportunity",
        title: "Check annual pricing for e1",
        body: "If annual billing saves 18%, this could reduce spend by about $5.40 per month.",
        subscriptionIds: ["e1"],
        estimatedMonthlyImpactMinor: 540
      },
      {
        kind: "annual_savings",
        severity: "opportunity",
        title: "Check annual pricing for e2",
        body: "If annual billing saves 18%, this could reduce spend by about $5.40 per month.",
        subscriptionIds: ["e2"],
        estimatedMonthlyImpactMinor: 540
      },
      {
        kind: "spend_twin",
        severity: "info",
        title: "Spend Twin",
        body: "Your subscriptions equal about 6 burritos, a weekend flight fund, or a month of gym membership.",
        subscriptionIds: []
      }
    ]);
  });

  it("two currencies: the raw sum mixes units, so nothing compares or prices it", () => {
    // Rupees first, dollars last: a rule that kept the LAST currency would call the
    // ₹500 + $50 sum "$550.00" and flag it against the dollar benchmark.
    const { insights } = createSpendSummary([
      sub({ id: "r", category: "entertainment", price: inr(50000) }),
      sub({ id: "d", category: "entertainment", price: usd(5000) })
    ], NOW);
    expect(kinds(insights)).toEqual(["annual_savings", "annual_savings"]);
  });
});

describe("createSpendSummary — each rule at its edge", () => {
  it("names the category in words: ai_tools reads 'Ai Tools'", () => {
    const { insights } = createSpendSummary([sub({ id: "a", category: "ai_tools", price: usd(3401) })], NOW);
    expect(ofKind(insights, "category_over_budget")[0]?.title).toBe("Ai Tools is above profile benchmark");
    const atBenchmark = createSpendSummary([sub({ id: "a", category: "ai_tools", price: usd(3400) })], NOW);
    expect(ofKind(atBenchmark.insights, "category_over_budget")).toEqual([]);
  });

  it.each<SubscriptionCategory>(["ai_tools", "productivity", "entertainment"])("flags three or more %s subscriptions as overlap, not two", (category) => {
    const three = ["x1", "x2", "x3"].map((id) => sub({ id, category, price: usd(100) }));
    expect(ofKind(createSpendSummary(three, NOW).insights, "duplicate_category")).toEqual([{
      kind: "duplicate_category",
      severity: "opportunity",
      title: `Review overlap in ${category === "ai_tools" ? "Ai Tools" : category[0]!.toUpperCase() + category.slice(1)}`,
      body: "3 active subscriptions sit in this category. Consolidating one could lower monthly spend.",
      subscriptionIds: ["x1", "x2", "x3"]
    }]);
    expect(ofKind(createSpendSummary(three.slice(0, 2), NOW).insights, "duplicate_category")).toEqual([]);
  });

  it("does not call three subscriptions in another category overlap", () => {
    const three = ["h1", "h2", "h3"].map((id) => sub({ id, category: "health", price: usd(100) }));
    expect(ofKind(createSpendSummary(three, NOW).insights, "duplicate_category")).toEqual([]);
  });

  it("suggests annual pricing for a monthly plan of $10.00 or more only", () => {
    const summary = createSpendSummary([
      sub({ id: "ten", price: usd(1000) }),
      sub({ id: "under", price: usd(999) }),
      sub({ id: "yearly", price: usd(12000), billingCycle: "annual" })
    ], NOW);
    expect(ofKind(summary.insights, "annual_savings").map((insight) => [insight.subscriptionIds, insight.estimatedMonthlyImpactMinor])).toEqual([[["ten"], 180]]);
  });

  it("asks to confirm the value of a plan last charged 30 or more days ago, unless rated high", () => {
    const summary = createSpendSummary([
      sub({ id: "thirty", lastChargedDate: "2026-08-31T12:00:00.000Z" }),
      sub({ id: "twentynine", lastChargedDate: "2026-09-01T12:00:00.000Z" }),
      sub({ id: "loved", lastChargedDate: "2026-01-01T00:00:00.000Z", valueRating: "high" })
    ], NOW);
    expect(ofKind(summary.insights, "unused_review")).toEqual([{
      kind: "unused_review",
      severity: "info",
      title: "Confirm value for thirty",
      body: "No recent value signal is available and the last charge is 30 days old.",
      subscriptionIds: ["thirty"]
    }]);
  });

  it("has no Spend Twin when nothing recurs, even with a home currency", () => {
    const summary = createSpendSummary([sub({ id: "t", billingCycle: "trial", status: "trial" })], NOW, { homeCurrency: "USD", rates: { USD: 1 } });
    expect(summary.totalMonthlyMinor).toBe(0);
    expect(ofKind(summary.insights, "spend_twin")).toEqual([]);
  });
});
