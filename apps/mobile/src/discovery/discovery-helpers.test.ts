import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyFreeCap, calculateNextRenewal, confidenceRank, currencyEvidence, detectCurrency, inferRecurringCycle, isWithin, slugify, summarizeFoundMoney, titleCase, toCurrencyCode } from "./discovery-helpers";
import { parseDay } from "../utils/day-text";

describe("inferRecurringCycle", () => {
  it("infers monthly / weekly / annual from the median gap", () => {
    expect(inferRecurringCycle([30, 31, 29])).toBe("monthly");
    expect(inferRecurringCycle([7, 7, 8])).toBe("weekly");
    expect(inferRecurringCycle([365, 366])).toBe("annual");
  });

  it("resists a single odd gap via the median", () => {
    expect(inferRecurringCycle([30, 30, 200])).toBe("monthly");
  });

  it("returns null for no gaps or an unknown cadence", () => {
    expect(inferRecurringCycle([])).toBeNull();
    expect(inferRecurringCycle([120, 130])).toBeNull(); // quarterly-ish, not supported
  });
});

describe("calculateNextRenewal (UTC days, F21)", () => {
  const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
  const day = (date: Date) => date.toISOString().slice(0, 10);

  it("adds one month for monthly cycles", () => {
    expect(day(calculateNextRenewal(utc(2026, 1, 15), "monthly"))).toBe("2026-02-15");
  });

  it("clamps Jan 31 to Feb 28 instead of overflowing into March, on any device time zone", () => {
    expect(day(calculateNextRenewal(utc(2026, 1, 31), "monthly"))).toBe("2026-02-28");
  });

  it("clamps Jan 31 to Feb 29 in leap years", () => {
    expect(day(calculateNextRenewal(utc(2028, 1, 31), "monthly"))).toBe("2028-02-29");
  });

  it("clamps annual renewals from Feb 29 to Feb 28", () => {
    expect(day(calculateNextRenewal(utc(2028, 2, 29), "annual"))).toBe("2029-02-28");
  });

  it("adds three months for quarterly cycles", () => {
    expect(day(calculateNextRenewal(utc(2026, 11, 30), "quarterly"))).toBe("2027-02-28");
  });

  it("adds seven days for weekly cycles", () => {
    expect(day(calculateNextRenewal(utc(2026, 1, 28), "weekly"))).toBe("2026-02-04");
  });

  it("keeps the time of day of a non-midnight input (the 'now' fallback)", () => {
    expect(calculateNextRenewal(new Date("2026-01-15T10:30:00.000Z"), "monthly").toISOString()).toBe("2026-02-15T10:30:00.000Z");
  });
});

describe("calculateNextRenewal and parseDay on a US device (UTC-5), where local arithmetic went wrong (F21)", () => {
  // Node re-reads TZ when process.env.TZ is assigned (checked: the same instant
  // reports day 30 in New York and 31 in Kolkata). Restored after the block;
  // vitest runs each file in its own context.
  const original = process.env.TZ;
  beforeAll(() => { process.env.TZ = "America/New_York"; });
  afterAll(() => { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; });

  it("the device really is UTC-5 here", () => {
    expect(new Date("2026-01-31T00:00:00.000Z").getTimezoneOffset()).toBe(300);
  });

  it("Jan 31 still clamps to Feb 28 (local getters read that instant as Jan 30 and gave 1 March)", () => {
    expect(calculateNextRenewal(new Date("2026-01-31T00:00:00.000Z"), "monthly").toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("a US-format charge date is the same UTC day as on any other device", () => {
    expect(parseDay("01/31/2026")?.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(parseDay("Jan 31, 2026")?.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
});

describe("shared discovery helpers", () => {
  it("ranks confidence levels", () => {
    expect(confidenceRank("high")).toBeGreaterThan(confidenceRank("medium"));
    expect(confidenceRank("medium")).toBeGreaterThan(confidenceRank("low"));
  });

  it("checks amounts within tolerance with an optional floor", () => {
    expect(isWithin(10.5, 10, 0.1)).toBe(true);
    expect(isWithin(12, 10, 0.1)).toBe(false);
    expect(isWithin(10.9, 10, 0.05, 1)).toBe(true);
  });

  it("slugifies and title-cases merchant names", () => {
    expect(slugify("Netflix.com Inc!")).toBe("netflix-com-inc");
    expect(titleCase("netflix premium")).toBe("Netflix Premium");
  });
});

describe("applyFreeCap", () => {
  it("adds everything and skips nothing when under the remaining slots", () => {
    const result = applyFreeCap(["a", "b", "c"], 10);
    expect(result).toEqual({ toAdd: ["a", "b", "c"], skipped: 0 });
  });

  it("clamps to the first N selected items in order when over the cap", () => {
    const result = applyFreeCap(["a", "b", "c", "d", "e"], 2);
    expect(result.toAdd).toEqual(["a", "b"]);
    expect(result.skipped).toBe(3);
  });

  it("adds nothing and skips everything when there are zero remaining slots", () => {
    const result = applyFreeCap(["a", "b"], 0);
    expect(result).toEqual({ toAdd: [], skipped: 2 });
  });

  it("never clamps for an unlimited (Pro/Family) caller passing Infinity", () => {
    const many = Array.from({ length: 25 }, (_, i) => i);
    const result = applyFreeCap(many, Infinity);
    expect(result.toAdd).toHaveLength(25);
    expect(result.skipped).toBe(0);
  });

  it("treats a negative remaining count the same as zero (never adds a negative slice)", () => {
    const result = applyFreeCap(["a", "b"], -3);
    expect(result).toEqual({ toAdd: [], skipped: 2 });
  });
});

describe("toCurrencyCode", () => {
  it("passes through a recognized code regardless of case", () => {
    expect(toCurrencyCode("USD")).toBe("USD");
    expect(toCurrencyCode("inr")).toBe("INR");
    expect(toCurrencyCode("Eur")).toBe("EUR");
  });

  it("falls back to USD for an unrecognized or empty currency string, never persisting an unformattable value", () => {
    expect(toCurrencyCode("XYZ")).toBe("USD");
    expect(toCurrencyCode("")).toBe("USD");
  });
});

describe("summarizeFoundMoney", () => {
  it("annualizes each item by its own billing cycle and sums them", () => {
    const summary = summarizeFoundMoney([
      { amount: 10, currency: "USD", billingCycle: "monthly" }, // -> 120/yr
      { amount: 5, currency: "USD", billingCycle: "weekly" },   // -> 260/yr
      { amount: 100, currency: "USD", billingCycle: "annual" }  // -> 100/yr
    ]);
    expect(summary).toEqual({ annualTotal: 480, currency: "USD", excludedCount: 0 });
  });

  it("does not fabricate a yearly figure for an unknown cadence", () => {
    const summary = summarizeFoundMoney([
      { amount: 50, currency: "USD", billingCycle: "unknown" },
      { amount: 10, currency: "USD", billingCycle: "monthly" }
    ]);
    expect(summary).toEqual({ annualTotal: 120, currency: "USD", excludedCount: 0 });
  });

  it("sums only the dominant currency and reports the rest as excluded, never mixing currencies", () => {
    const summary = summarizeFoundMoney([
      { amount: 10, currency: "USD", billingCycle: "monthly" },
      { amount: 12, currency: "USD", billingCycle: "monthly" },
      { amount: 499, currency: "INR", billingCycle: "monthly" }
    ]);
    expect(summary.currency).toBe("USD");
    expect(summary.annualTotal).toBe((10 + 12) * 12);
    expect(summary.excludedCount).toBe(1);
  });

  it("picks INR as dominant when it's the majority, excluding the lone USD item", () => {
    const summary = summarizeFoundMoney([
      { amount: 499, currency: "INR", billingCycle: "monthly" },
      { amount: 999, currency: "INR", billingCycle: "monthly" },
      { amount: 10, currency: "USD", billingCycle: "monthly" }
    ]);
    expect(summary.currency).toBe("INR");
    expect(summary.excludedCount).toBe(1);
  });

  it("returns a zero total for an empty batch", () => {
    expect(summarizeFoundMoney([])).toEqual({ annualTotal: 0, currency: "USD", excludedCount: 0 });
  });
});

describe("quarterly cadence", () => {
  it("infers quarterly from a ~90-day median gap, at both edges of the window", () => {
    expect(inferRecurringCycle([91, 90])).toBe("quarterly");
    expect(inferRecurringCycle([85])).toBe("quarterly");
    expect(inferRecurringCycle([95])).toBe("quarterly");
    expect(inferRecurringCycle([84])).toBeNull();
    expect(inferRecurringCycle([96])).toBeNull();
  });

  it("annualizes a quarterly amount as ×4 (not ×12)", () => {
    expect(summarizeFoundMoney([{ amount: 30, currency: "USD", billingCycle: "quarterly" }])).toEqual({ annualTotal: 120, currency: "USD", excludedCount: 0 });
  });
});

describe("currencyEvidence / detectCurrency (F18, F95)", () => {
  it("reads each currency's markers, and returns null for bare numbers", () => {
    expect(currencyEvidence("€12.99 a month")).toBe("EUR");
    expect(currencyEvidence("GBP 9.99")).toBe("GBP");
    expect(currencyEvidence("Rs. 499 and ₹499")).toBe("INR");
    expect(currencyEvidence("AUD 12 or A$12")).toBe("AUD");
    expect(currencyEvidence("$15.49")).toBe("USD");
    expect(currencyEvidence("15.49")).toBeNull();
  });

  it("F95: CA$ is Canadian dollars, not Australian (the app writes CAD as CA$)", () => {
    expect(currencyEvidence("CA$12.00")).toBe("CAD");
    expect(currencyEvidence("Total: CA$12.00 (renews at CA$12.00)")).toBe("CAD");
    expect(currencyEvidence("C$12.00")).toBe("CAD");
    expect(currencyEvidence("A$12.00")).toBe("AUD");
    // CA$ is not also counted as a US "$": two CA$ beat one bare $ (a tie
    // would go to USD by the detector's rule).
    expect(currencyEvidence("CA$12.00 CA$3.00 $1")).toBe("CAD");
  });

  it("detectCurrency (email bodies) keeps its USD default when nothing is marked", () => {
    expect(detectCurrency("Your plan renews soon")).toBe("USD");
    expect(detectCurrency("Charged CA$12.00")).toBe("CAD");
  });
});
