import { describe, expect, it } from "vitest";
import type { ExchangeRates } from "./coach";
import { createSpendTwin, summarizeSpendTwin } from "./twin";

// USD-pivot table (units of each currency per 1 USD).
const rates: ExchangeRates = { USD: 1, INR: 95 };

describe("createSpendTwin", () => {
  it("returns nothing to compare for zero or negative spend", () => {
    expect(createSpendTwin(0)).toEqual([]);
    expect(createSpendTwin(-500)).toEqual([]);
  });

  it("divides USD spend by the fixed USD reference prices, whole units once spend exceeds a unit", () => {
    const twin = createSpendTwin(28400);
    expect(twin.map((c) => [c.label, c.unitCostMinor, c.quantity])).toEqual([
      ["Chipotle burritos", 1000, 28],
      ["gym memberships", 7000, 4],
      ["weekend flight fund", 22000, 1],
      ["grocery weeks", 9500, 3]
    ]);
  });

  it("uses one decimal when spend is below a unit's cost", () => {
    const twin = createSpendTwin(500);
    expect(twin[0]?.quantity).toBe(0.5); // half a $10 burrito
    expect(twin[1]?.quantity).toBe(0.1); // 500 / 7000 = 0.07 -> 0.1
  });

  it("converts the USD reference prices into a non-USD home currency before comparing", () => {
    const twin = createSpendTwin(190000, "INR", rates); // ₹1,900
    expect(twin[0]).toMatchObject({ label: "Chipotle burritos", unitCostMinor: 95000, quantity: 2 });
    expect(twin[1]).toMatchObject({ unitCostMinor: 665000, quantity: 0.3 });
  });

  it("returns no comparisons (never a fabricated one) when no rate converts USD into the home currency", () => {
    // Before the fix the USD price was reused as if it were INR: a "$10"
    // burrito became ₹10, so ₹1,900 read as 190 burritos.
    expect(createSpendTwin(190000, "INR")).toEqual([]);
    expect(createSpendTwin(190000, "INR", { USD: 1 })).toEqual([]);
  });
});

describe("summarizeSpendTwin", () => {
  it("names the first two comparisons in the home currency", () => {
    expect(summarizeSpendTwin(28400)).toBe("$284.00 per month equals about 28 Chipotle burritos or 4 gym memberships.");
    expect(summarizeSpendTwin(190000, "INR", rates)).toBe("₹1,900.00 per month equals about 2 Chipotle burritos or 0.3 gym memberships.");
  });

  it("says there is nothing to compare when there is no spend", () => {
    expect(summarizeSpendTwin(0)).toBe("No subscription spend to compare yet.");
  });

  it("says a rate is missing, rather than 'no spend', when there IS spend but no exchange rate", () => {
    expect(summarizeSpendTwin(190000, "INR")).toBe("₹1,900.00 per month. Comparisons need an exchange rate for INR, and none is available.");
  });
});
