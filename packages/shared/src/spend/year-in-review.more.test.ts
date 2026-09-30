import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { buildYearInReview } from "./year-in-review";

const sub = (over: Partial<Subscription> & Pick<Subscription, "id">): Subscription => ({
  name: over.id,
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

const NOW = new Date(Date.UTC(2026, 5, 15)); // window: Jul 2025 .. Jun 2026

describe("buildYearInReview — fx", () => {
  it("converts into the home currency and excludes (and counts) subscriptions with no rate", () => {
    const review = buildYearInReview([
      sub({ id: "inr", price: { amountMinor: 9500, currency: "INR" } }), // $1.00 / month
      sub({ id: "gbp", price: { amountMinor: 500, currency: "GBP" } }) // no rate
    ], NOW, { homeCurrency: "USD", rates: { USD: 1, INR: 95 } });
    expect(review.projectedAnnualMinor).toBe(1200);
    expect(review.totalSpentMinor).toBe(1200); // 12 months x $1.00; the GBP one adds 0
    expect(review.mostExpensive).toEqual({ name: "inr", monthlyMinor: 100 });
    expect(review.excludedCurrencyCount).toBe(1);
    expect(review.activeCount).toBe(2);
  });

  it("omits the exclusion count without fx", () => {
    expect("excludedCurrencyCount" in buildYearInReview([sub({ id: "a" })], NOW)).toBe(false);
  });
});

describe("buildYearInReview — rankings", () => {
  it("keeps the first of equal or cheaper subscriptions as the most expensive", () => {
    const review = buildYearInReview([
      sub({ id: "big", price: { amountMinor: 3000, currency: "USD" } }),
      sub({ id: "small", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "tie", price: { amountMinor: 3000, currency: "USD" } })
    ], NOW);
    expect(review.mostExpensive?.name).toBe("big");
  });

  it("picks the category with the most monthly spend, keeping the first on a tie", () => {
    const review = buildYearInReview([
      sub({ id: "a", category: "productivity", price: { amountMinor: 3000, currency: "USD" } }),
      sub({ id: "b", category: "health", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "c", category: "health", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "d", category: "education", price: { amountMinor: 3000, currency: "USD" } })
    ], NOW);
    expect(review.topCategory).toEqual({ category: "productivity", monthlyMinor: 3000 });
  });

  it("names the month of an annual charge as the busiest", () => {
    const review = buildYearInReview([
      sub({ id: "m", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "a", billingCycle: "annual", price: { amountMinor: 12000, currency: "USD" }, nextRenewalDate: "2026-03-01T00:00:00.000Z" })
    ], NOW);
    expect(review.busiestMonth).toEqual({ label: "Mar", amountMinor: 13000 });
    expect(review.totalSpentMinor).toBe(12 * 1000 + 12000);
    expect(review.projectedAnnualMinor).toBe(12 * 1000 + 12 * 1000);
  });

  it("leaves trials and unknown cycles out of the active count and rankings", () => {
    const review = buildYearInReview([
      sub({ id: "t", billingCycle: "trial", price: { amountMinor: 9999, currency: "USD" } }),
      sub({ id: "u", billingCycle: "unknown", price: { amountMinor: 9999, currency: "USD" } })
    ], NOW);
    expect(review.activeCount).toBe(0);
    expect(review.mostExpensive).toBeNull();
    expect(review.topCategory).toBeNull();
    // With no spend at all, busiestMonth is the first empty month at 0. The
    // Wrapped screen relies on amountMinor > 0 to hide it (apps/mobile/app/wrapped.tsx).
    expect(review.busiestMonth).toEqual({ label: "Jul", amountMinor: 0 });
  });
});

describe("buildYearInReview — coverage window", () => {
  it("ignores createdAt values it cannot parse when finding where tracking began", () => {
    const review = buildYearInReview([
      sub({ id: "bad", createdAt: "not a date", status: "cancelled" }),
      sub({ id: "ok", createdAt: "2026-02-10T00:00:00.000Z" })
    ], NOW);
    expect(review.coverageStartLabel).toBe("Feb 2026");
    expect(review.coversFullTrailingYear).toBe(false);
    expect(review.cancelledCount).toBe(1);
  });

  it("reports no coverage start when no createdAt can be parsed", () => {
    const review = buildYearInReview([sub({ id: "bad", createdAt: "garbage" })], NOW);
    expect(review.coverageStartLabel).toBeNull();
    expect(review.coversFullTrailingYear).toBe(false);
  });

  it("counts tracking that began exactly on the window's first day as a full year", () => {
    const review = buildYearInReview([sub({ id: "edge", createdAt: "2025-07-01T00:00:00.000Z" })], NOW);
    expect(review.coversFullTrailingYear).toBe(true);
    expect(review.coverageStartLabel).toBe("Jul 2025");
  });
});
