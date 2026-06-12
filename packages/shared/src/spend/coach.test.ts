import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createSpendSummary } from "./coach";

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
});
