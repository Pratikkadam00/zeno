import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { buildYearInReview } from "./year-in-review";

const sub = (over: Partial<Subscription> & Pick<Subscription, "id" | "name">): Subscription => ({
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  version: 1,
  category: "entertainment",
  price: { amountMinor: 1000, currency: "USD" },
  billingCycle: "monthly",
  status: "active",
  ownerProfileId: "p",
  source: "manual",
  ...over
});

const NOW = new Date(Date.UTC(2026, 5, 15));

describe("buildYearInReview", () => {
  it("summarizes spend, priciest sub, top category, and counts", () => {
    const subs = [
      sub({ id: "a", name: "Netflix", price: { amountMinor: 1500, currency: "USD" }, category: "entertainment" }),
      sub({ id: "b", name: "Adobe", price: { amountMinor: 5500, currency: "USD" }, category: "productivity" }),
      sub({ id: "c", name: "Old", status: "cancelled" })
    ];
    const r = buildYearInReview(subs, NOW);
    expect(r.activeCount).toBe(2);
    expect(r.cancelledCount).toBe(1);
    expect(r.mostExpensive?.name).toBe("Adobe");
    expect(r.topCategory?.category).toBe("productivity");
    expect(r.projectedAnnualMinor).toBe((1500 + 5500) * 12);
    expect(r.totalSpentMinor).toBeGreaterThan(0);
    expect(r.busiestMonth).not.toBeNull();
  });

  it("handles an empty list", () => {
    const r = buildYearInReview([], NOW);
    expect(r.activeCount).toBe(0);
    expect(r.totalSpentMinor).toBe(0);
    expect(r.mostExpensive).toBeNull();
    expect(r.topCategory).toBeNull();
    expect(r.coverageStartLabel).toBeNull();
    expect(r.coversFullTrailingYear).toBe(false);
  });

  it("reports a full trailing year for a long-time tracker", () => {
    // createdAt Jan 2025 is before the window start (Jul 2025), so the total
    // genuinely spans 12 months.
    const r = buildYearInReview([sub({ id: "a", name: "Netflix" })], NOW);
    expect(r.coversFullTrailingYear).toBe(true);
    expect(r.coverageStartLabel).toBe("Jul 2025");
  });

  it("reports the tracking-start month for a new user (not a full year)", () => {
    const r = buildYearInReview(
      [sub({ id: "x", name: "New", createdAt: "2026-03-01T00:00:00.000Z" })],
      NOW
    );
    expect(r.coversFullTrailingYear).toBe(false);
    expect(r.coverageStartLabel).toBe("Mar 2026");
  });
});
