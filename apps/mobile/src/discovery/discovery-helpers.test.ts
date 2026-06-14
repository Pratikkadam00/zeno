import { describe, expect, it } from "vitest";
import { calculateNextRenewal, confidenceRank, inferRecurringCycle, isWithin, slugify, titleCase } from "./discovery-helpers";

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

describe("calculateNextRenewal", () => {
  it("adds one month for monthly cycles", () => {
    const next = calculateNextRenewal(new Date(2026, 0, 15), "monthly");
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(15);
  });

  it("clamps Jan 31 to Feb 28 instead of overflowing into March", () => {
    const next = calculateNextRenewal(new Date(2026, 0, 31), "monthly");
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it("clamps Jan 31 to Feb 29 in leap years", () => {
    const next = calculateNextRenewal(new Date(2028, 0, 31), "monthly");
    expect(next.getFullYear()).toBe(2028);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(29);
  });

  it("clamps annual renewals from Feb 29 to Feb 28", () => {
    const next = calculateNextRenewal(new Date(2028, 1, 29), "annual");
    expect(next.getFullYear()).toBe(2029);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it("adds seven days for weekly cycles", () => {
    const next = calculateNextRenewal(new Date(2026, 0, 28), "weekly");
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(4);
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
