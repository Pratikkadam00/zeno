import type { Subscription } from "@zeno/shared";
import { describe, expect, it } from "vitest";
import { detectAnnualSavings, detectDuplicates, detectTrialEnding, detectUnused, generateInsights, getTotalSavingOpportunity } from "./insightsEngine";

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

