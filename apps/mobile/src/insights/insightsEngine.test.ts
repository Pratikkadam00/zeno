import type { Subscription } from "@zeno/shared";
import { describe, expect, it } from "vitest";
import { detectDuplicates, detectTrialEnding, generateInsights, getTotalSavingOpportunity } from "./insightsEngine";

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
});

