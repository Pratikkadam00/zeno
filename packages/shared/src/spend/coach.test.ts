import { describe, expect, it } from "vitest";
import type { Subscription } from "../domain";
import { convertMinor, createSpendSummary, monthlyAmount, monthlyAmountIn, type ExchangeRates } from "./coach";

// USD-pivot table matching the shape returned by open.er-api.com/v6/latest/USD.
const rates: ExchangeRates = { USD: 1, EUR: 0.9, GBP: 0.75, INR: 95, CAD: 1.4, AUD: 1.5 };

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

describe("FX conversion", () => {
  it("convertMinor returns the same amount when currencies match, with no rates needed", () => {
    expect(convertMinor(2000, "USD", "USD", {})).toBe(2000);
  });

  it("convertMinor converts via the USD-pivot rate table", () => {
    // 9500 paise (₹95) at 95 INR/USD -> $1 -> 90 EUR-cents at 0.9 EUR/USD.
    expect(convertMinor(9500, "INR", "EUR", rates)).toBe(90);
  });

  it("convertMinor returns null (never a fabricated number) when a rate is missing", () => {
    expect(convertMinor(2000, "USD", "INR", {})).toBeNull();
    expect(convertMinor(2000, "USD", "INR", { USD: 1 })).toBeNull();
  });

  it("monthlyAmountIn normalizes the billing cycle, then converts", () => {
    const annualInr = sub({ id: "a", name: "A", category: "other", price: { amountMinor: 114000, currency: "INR" }, billingCycle: "annual" });
    // 114000/12 = 9500 paise/month = ₹95 = $1 = 100 USD cents.
    expect(monthlyAmountIn(annualInr, "USD", rates)).toBe(100);
  });

  it("monthlyAmountIn returns null when the subscription's currency has no rate", () => {
    const noRate = sub({ id: "n", name: "N", category: "other", price: { amountMinor: 1000, currency: "GBP" }, billingCycle: "monthly" });
    expect(monthlyAmountIn(noRate, "USD", { USD: 1 })).toBeNull();
  });

  it("createSpendSummary converts mixed-currency subscriptions into the home currency instead of summing raw minor units", () => {
    const summary = createSpendSummary([
      sub({ id: "usd", name: "USD sub", category: "other", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "inr", name: "INR sub", category: "other", price: { amountMinor: 9500, currency: "INR" } })
    ], new Date(), { homeCurrency: "USD", rates });

    // $10 + (₹95 -> $1) = $11 = 1100 cents. A naive raw sum would be 10500.
    expect(summary.totalMonthlyMinor).toBe(1100);
    expect(summary.excludedCurrencyCount).toBe(0);
  });

  it("createSpendSummary excludes (never silently sums) a subscription whose currency has no rate, and reports the count", () => {
    const summary = createSpendSummary([
      sub({ id: "usd", name: "USD sub", category: "other", price: { amountMinor: 1000, currency: "USD" } }),
      sub({ id: "gbp", name: "GBP sub", category: "other", price: { amountMinor: 500, currency: "GBP" } })
    ], new Date(), { homeCurrency: "USD", rates: { USD: 1 } });

    expect(summary.totalMonthlyMinor).toBe(1000);
    expect(summary.excludedCurrencyCount).toBe(1);
  });

  it("omits excludedCurrencyCount entirely when fx is not passed (legacy behavior unchanged)", () => {
    const summary = createSpendSummary([
      sub({ id: "usd", name: "USD sub", category: "other", price: { amountMinor: 1000, currency: "USD" } })
    ]);
    expect(summary.excludedCurrencyCount).toBeUndefined();
  });
});
