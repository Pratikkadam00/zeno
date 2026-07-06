import type { ExchangeRates, Subscription } from "@zeno/shared";
import { describe, expect, it } from "vitest";
import { budgetStatus, computeBudgetForecast, computeCategoryForecast, suggestedCapMinor } from "./budget";

const rates: ExchangeRates = { USD: 1, INR: 95, GBP: 0.75 };

function sub(partial: Partial<Subscription> & { id: string }): Subscription {
  return {
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    version: 1,
    name: "Test",
    category: "other",
    price: { amountMinor: 1000, currency: "USD" },
    billingCycle: "monthly",
    status: "active",
    ownerProfileId: "profile_local",
    source: "manual",
    ...partial
  };
}

describe("computeBudgetForecast", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("splits committed (past) vs projected (future) charges this month", () => {
    const subs = [
      // renews Jun 20 — future this month → projected only
      sub({ id: "a", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 1599, currency: "USD" } }),
      // renews Jul 2 — so its June charge (Jun 2) already happened → committed
      sub({ id: "b", nextRenewalDate: "2026-07-02T00:00:00.000Z", price: { amountMinor: 1099, currency: "USD" } })
    ];
    const forecast = computeBudgetForecast(subs, now);
    expect(forecast.projectedMinor).toBe(1599 + 1099);
    expect(forecast.committedMinor).toBe(1099);
    expect(forecast.remaining.map((r) => r.id)).toEqual(["a"]);
  });

  it("ignores cancelled, paused, and zero-price subscriptions", () => {
    const subs = [
      sub({ id: "c", status: "cancelled", nextRenewalDate: "2026-06-20T00:00:00.000Z" }),
      sub({ id: "p", status: "paused", nextRenewalDate: "2026-06-20T00:00:00.000Z" }),
      sub({ id: "z", price: { amountMinor: 0, currency: "USD" }, nextRenewalDate: "2026-06-20T00:00:00.000Z" })
    ];
    expect(computeBudgetForecast(subs, now).projectedMinor).toBe(0);
  });

  it("counts an annual subscription only in its renewal month", () => {
    const renewsThisMonth = sub({ id: "ann1", billingCycle: "annual", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 12000, currency: "USD" } });
    const renewsOtherMonth = sub({ id: "ann2", billingCycle: "annual", nextRenewalDate: "2026-11-10T00:00:00.000Z", price: { amountMinor: 12000, currency: "USD" } });
    expect(computeBudgetForecast([renewsThisMonth], now).projectedMinor).toBe(12000);
    expect(computeBudgetForecast([renewsOtherMonth], now).projectedMinor).toBe(0);
  });

  it("clamps a month-end anchor instead of overflowing into the next month", () => {
    // A monthly sub anchored on the 31st, viewed in February: the February charge
    // must clamp to Feb 28 — not overflow to "Feb 31" → Mar 3 (and skip Feb).
    const feb = new Date("2026-02-15T12:00:00.000Z");
    const s = sub({ id: "me", billingCycle: "monthly", nextRenewalDate: "2026-03-31T09:00:00.000Z", price: { amountMinor: 999, currency: "USD" } });
    const forecast = computeBudgetForecast([s], feb);
    expect(forecast.projectedMinor).toBe(999);
    expect(forecast.remaining).toHaveLength(1);
    expect(forecast.remaining[0]?.date.slice(0, 10)).toBe("2026-02-28");
  });

  it("counts every weekly charge that falls in the month", () => {
    // Weekly sub renewing Jun 18 → June charges on the 4th, 11th, 18th, 25th.
    const s = sub({ id: "wk", billingCycle: "weekly", nextRenewalDate: "2026-06-18T00:00:00.000Z", price: { amountMinor: 500, currency: "USD" } });
    const forecast = computeBudgetForecast([s], now); // now = Jun 15
    expect(forecast.projectedMinor).toBe(2000); // 4 weekly charges
    expect(forecast.committedMinor).toBe(1000); // Jun 4 + Jun 11 already passed
    expect(forecast.remaining).toHaveLength(2); // Jun 18 + Jun 25 still to come
  });

  it("converts mixed-currency charges into home currency instead of summing raw minor units", () => {
    const subs = [
      sub({ id: "usd", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "inr", nextRenewalDate: "2026-06-22T00:00:00.000Z", price: { amountMinor: 9500, currency: "INR" } })
    ];
    const forecast = computeBudgetForecast(subs, now, { homeCurrency: "USD", rates });
    // $10 + (₹95 -> $1) = $11 = 1100 cents. A naive raw sum would be 10500.
    expect(forecast.projectedMinor).toBe(1100);
    expect(forecast.excludedCurrencyCount).toBe(0);
  });

  it("excludes (never silently sums) a subscription whose currency has no rate, and reports the count", () => {
    const subs = [
      sub({ id: "usd", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "eur", nextRenewalDate: "2026-06-22T00:00:00.000Z", price: { amountMinor: 900, currency: "EUR" } })
    ];
    const forecast = computeBudgetForecast(subs, now, { homeCurrency: "USD", rates });
    expect(forecast.projectedMinor).toBe(1000);
    expect(forecast.excludedCurrencyCount).toBe(1);
  });

  it("omits excludedCurrencyCount entirely when fx is not passed (legacy behavior unchanged)", () => {
    const subs = [sub({ id: "usd", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } })];
    const forecast = computeBudgetForecast(subs, now);
    expect(forecast.excludedCurrencyCount).toBeUndefined();
  });
});

describe("computeCategoryForecast", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("converts mixed-currency charges into home currency per category", () => {
    const subs = [
      sub({ id: "usd", category: "entertainment", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "inr", category: "entertainment", nextRenewalDate: "2026-06-22T00:00:00.000Z", price: { amountMinor: 9500, currency: "INR" } })
    ];
    const forecast = computeCategoryForecast(subs, now, { homeCurrency: "USD", rates });
    expect(forecast.entertainment).toBe(1100);
  });

  it("excludes a category charge whose currency has no rate", () => {
    const subs = [sub({ id: "eur", category: "entertainment", nextRenewalDate: "2026-06-20T00:00:00.000Z", price: { amountMinor: 900, currency: "EUR" } })];
    const forecast = computeCategoryForecast(subs, now, { homeCurrency: "USD", rates });
    expect(forecast.entertainment).toBeUndefined();
  });
});

describe("suggestedCapMinor", () => {
  it("rounds projected up to the nearest $5", () => {
    expect(suggestedCapMinor(7596)).toBe(8000); // $75.96 → $80
    expect(suggestedCapMinor(8000)).toBe(8000); // exact → unchanged
    expect(suggestedCapMinor(0)).toBe(500); // floor at $5
  });
});

describe("budgetStatus", () => {
  it("classifies under / approaching / over", () => {
    expect(budgetStatus(5000, 8000)).toBe("under"); // 5000 < 6800
    expect(budgetStatus(7000, 8000)).toBe("approaching"); // 7000 > 6800, <= cap
    expect(budgetStatus(8001, 8000)).toBe("over");
  });
});
