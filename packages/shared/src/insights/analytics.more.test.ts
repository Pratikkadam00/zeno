import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { createAnalyticsSnapshot } from "./analytics";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const DAY = 86_400_000;

function sub(input: Partial<Subscription> & Pick<Subscription, "id">): Subscription {
  return {
    name: input.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
    category: "other",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "p",
    source: "manual",
    ...input
  };
}

describe("createAnalyticsSnapshot", () => {
  it("reports zeros and no highest category when nothing is active", () => {
    const snapshot = createAnalyticsSnapshot([sub({ id: "gone", status: "cancelled" })], NOW);
    expect(snapshot).toEqual({
      monthlySpendMinor: 0,
      annualizedSpendMinor: 0,
      activeSubscriptionCount: 0,
      averageMonthlySubscriptionMinor: 0,
      renewalLoadNext30Days: 0,
      cancellationOpportunityMinor: 0
    });
  });

  it("averages to 0, not NaN, when every active subscription lacks a rate", () => {
    const snapshot = createAnalyticsSnapshot([sub({ id: "gbp", price: { amountMinor: 500, currency: "GBP" } })], NOW, { homeCurrency: "USD", rates: { USD: 1 } });
    expect(snapshot.averageMonthlySubscriptionMinor).toBe(0);
    expect(snapshot.excludedCurrencyCount).toBe(1);
    expect(snapshot.activeSubscriptionCount).toBe(1);
    expect("highestCategory" in snapshot).toBe(false);
  });

  it("leaves a low-value subscription with no rate out of the cancellation opportunity", () => {
    const snapshot = createAnalyticsSnapshot([
      sub({ id: "usd", valueRating: "low", price: { amountMinor: 700, currency: "USD" } }),
      sub({ id: "inr", valueRating: "low", price: { amountMinor: 9500, currency: "INR" } }),
      sub({ id: "gbp", valueRating: "low", price: { amountMinor: 500, currency: "GBP" } }),
      sub({ id: "kept", valueRating: "high", price: { amountMinor: 5000, currency: "USD" } })
    ], NOW, { homeCurrency: "USD", rates: { USD: 1, INR: 95 } });
    expect(snapshot.cancellationOpportunityMinor).toBe(700 + 100);
    expect(snapshot.monthlySpendMinor).toBe(700 + 100 + 5000);
    expect(snapshot.highestCategory).toEqual({ category: "other", monthlySpendMinor: 5800 });
  });

  it("counts renewals from now through exactly 30 days ahead, inclusive", () => {
    const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
    const snapshot = createAnalyticsSnapshot([
      sub({ id: "now", nextRenewalDate: at(0) }),
      sub({ id: "edge", nextRenewalDate: at(30 * DAY) }),
      sub({ id: "beyond", nextRenewalDate: at(30 * DAY + 1) }),
      sub({ id: "overdue", nextRenewalDate: at(-1) }),
      sub({ id: "unparseable", nextRenewalDate: "soon" }),
      sub({ id: "undated" })
    ], NOW);
    expect(snapshot.renewalLoadNext30Days).toBe(2);
  });
});
