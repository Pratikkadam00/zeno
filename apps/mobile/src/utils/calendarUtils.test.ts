import type { Subscription, BillingCycle } from "@subradar/shared";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getMarkedDates, getMonthlyTotal, getProjectedAnnual, getSubscriptionsForDate, getWeeklyGroups } from "./calendarUtils";

function buildSubscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: overrides.id ?? "subscription-test",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    version: 1,
    name: overrides.name ?? "Test",
    category: overrides.category ?? "productivity",
    price: {
      amountMinor: overrides.price?.amountMinor ?? 1299,
      currency: overrides.price?.currency ?? "USD"
    },
    billingCycle: (overrides.billingCycle ?? "monthly") as BillingCycle,
    nextRenewalDate: overrides.nextRenewalDate,
    status: overrides.status ?? "active",
    ownerProfileId: "profile_local",
    source: overrides.source ?? "manual"
  };
}

describe("calendarUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates marked dates for 3 subscriptions on different dates", () => {
    const marked = getMarkedDates([
      buildSubscription({ id: "a", nextRenewalDate: "2026-05-29T10:00:00.000Z" }),
      buildSubscription({ id: "b", category: "entertainment", nextRenewalDate: "2026-05-30T10:00:00.000Z" }),
      buildSubscription({ id: "c", category: "education", nextRenewalDate: "2026-06-02T10:00:00.000Z" })
    ]);

    expect(Object.keys(marked)).toHaveLength(3);
    expect(marked["2026-05-29"].dots).toHaveLength(1);
    expect(marked["2026-05-30"].dots).toHaveLength(1);
    expect(marked["2026-06-02"].dots).toHaveLength(1);
  });

  it("groups two subscriptions on the same date", () => {
    const marked = getMarkedDates([
      buildSubscription({ id: "a", nextRenewalDate: "2026-05-29T10:00:00.000Z" }),
      buildSubscription({ id: "b", nextRenewalDate: "2026-05-29T12:00:00.000Z", category: "finance" })
    ]);

    expect(marked["2026-05-29"].dots).toHaveLength(2);
    expect(marked["2026-05-29"].marked).toBe(true);
  });

  it("returns matching subscriptions for exact selected date", () => {
    const subscriptions = [
      buildSubscription({ id: "a", nextRenewalDate: "2026-05-29T10:00:00.000Z" }),
      buildSubscription({ id: "b", nextRenewalDate: "2026-05-29T21:00:00.000Z" }),
      buildSubscription({ id: "c", nextRenewalDate: "2026-05-30T08:00:00.000Z" })
    ];
    const result = getSubscriptionsForDate(subscriptions, "2026-05-29");
    expect(result.map((item) => item.id)).toEqual(["a", "b"]);
    expect(getSubscriptionsForDate(subscriptions, "2026-06-01")).toEqual([]);
  });

  it("calculates monthly total for current month", () => {
    const total = getMonthlyTotal(
      [
        buildSubscription({ id: "a", nextRenewalDate: "2026-05-05T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
        buildSubscription({ id: "b", nextRenewalDate: "2026-05-10T00:00:00.000Z", price: { amountMinor: 2000, currency: "USD" } }),
        buildSubscription({ id: "c", nextRenewalDate: "2026-06-01T00:00:00.000Z", price: { amountMinor: 4000, currency: "USD" } })
      ],
      2026,
      5
    );

    expect(total).toBe(30);
  });

  it("buckets upcoming subscriptions into week groups", () => {
    const subscriptions = [
      buildSubscription({ id: "a", nextRenewalDate: "2026-06-02T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      buildSubscription({ id: "b", nextRenewalDate: "2026-06-07T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      buildSubscription({ id: "c", nextRenewalDate: "2026-06-15T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      buildSubscription({ id: "d", nextRenewalDate: "2026-07-10T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } })
    ];
    const groups = getWeeklyGroups(subscriptions);

    expect(groups.thisWeek).toHaveLength(1);
    expect(groups.nextWeek).toHaveLength(1);
    expect(groups.laterThisMonth).toHaveLength(1);
  });

  it("projects annual spend across the remaining year", () => {
    const projected = getProjectedAnnual([
      buildSubscription({
        id: "a",
        billingCycle: "monthly",
        price: { amountMinor: 2000, currency: "USD" },
        nextRenewalDate: "2026-06-01T00:00:00.000Z"
      }),
      buildSubscription({
        id: "b",
        billingCycle: "annual",
        price: { amountMinor: 12000, currency: "USD" },
        nextRenewalDate: "2026-11-01T00:00:00.000Z"
      }),
      buildSubscription({
        id: "c",
        billingCycle: "annual",
        price: { amountMinor: 13000, currency: "USD" },
        nextRenewalDate: "2027-02-01T00:00:00.000Z"
      })
    ]);

    expect(projected).toBe(280);
  });
});
