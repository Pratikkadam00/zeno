import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createSpendSummary, monthlyAmount } from "./coach";

function sub(input: Partial<Subscription> & Pick<Subscription, "id" | "name" | "category" | "price">): Subscription {
  return {
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    version: 1,
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "profile_local",
    source: "manual",
    ...input
  };
}

describe("spend coach", () => {
  it("summarizes spend and flags category over benchmark", () => {
    const summary = createSpendSummary([
      sub({ id: "a", name: "ChatGPT", category: "ai_tools", price: { amountMinor: 2000, currency: "USD" } }),
      sub({ id: "b", name: "Claude", category: "ai_tools", price: { amountMinor: 2000, currency: "USD" } }),
      sub({ id: "c", name: "Midjourney", category: "ai_tools", price: { amountMinor: 1000, currency: "USD" } })
    ]);

    expect(summary.totalMonthlyMinor).toBe(5000);
    expect(summary.insights.some((insight) => insight.kind === "category_over_budget")).toBe(true);
    expect(summary.insights.some((insight) => insight.kind === "duplicate_category")).toBe(true);
  });

  it("normalizes recurring cycles to monthly spend", () => {
    expect(monthlyAmount(sub({ id: "m", name: "M", category: "other", price: { amountMinor: 1200, currency: "USD" }, billingCycle: "monthly" }))).toBe(1200);
    expect(monthlyAmount(sub({ id: "a", name: "A", category: "other", price: { amountMinor: 12000, currency: "USD" }, billingCycle: "annual" }))).toBe(1000);
    expect(monthlyAmount(sub({ id: "q", name: "Q", category: "other", price: { amountMinor: 3000, currency: "USD" }, billingCycle: "quarterly" }))).toBe(1000);
    expect(monthlyAmount(sub({ id: "w", name: "W", category: "other", price: { amountMinor: 100, currency: "USD" }, billingCycle: "weekly" }))).toBe(Math.round((100 * 52) / 12));
  });

  it("excludes trial and unknown cycles from recurring monthly spend", () => {
    expect(monthlyAmount(sub({ id: "t", name: "T", category: "other", price: { amountMinor: 9999, currency: "USD" }, billingCycle: "trial" }))).toBe(0);
    expect(monthlyAmount(sub({ id: "u", name: "U", category: "other", price: { amountMinor: 9999, currency: "USD" }, billingCycle: "unknown" }))).toBe(0);

    const summary = createSpendSummary([
      sub({ id: "paid", name: "Spotify", category: "entertainment", price: { amountMinor: 1099, currency: "USD" }, billingCycle: "monthly" }),
      sub({ id: "trial", name: "TrialApp", category: "ai_tools", price: { amountMinor: 5000, currency: "USD" }, billingCycle: "trial" }),
      sub({ id: "unknown", name: "MysteryApp", category: "ai_tools", price: { amountMinor: 5000, currency: "USD" }, billingCycle: "unknown" })
    ]);

    // Only the monthly subscription contributes; trial/unknown add 0.
    expect(summary.totalMonthlyMinor).toBe(1099);
  });
});
