import { describe, expect, it } from "vitest";
import { getDaysRemaining, rollRenewalForward } from "./subscription-ui";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("rollRenewalForward", () => {
  it("passes through missing, invalid, trial, and unknown-cycle input untouched", () => {
    expect(rollRenewalForward(undefined, "monthly")).toBeUndefined();
    expect(rollRenewalForward(null, "monthly")).toBeUndefined();
    expect(rollRenewalForward("not-a-date", "monthly")).toBe("not-a-date");
    expect(rollRenewalForward("2020-01-01T00:00:00.000Z", "trial")).toBe("2020-01-01T00:00:00.000Z");
    expect(rollRenewalForward("2020-01-01T00:00:00.000Z", "unknown")).toBe("2020-01-01T00:00:00.000Z");
  });

  it("returns a future date unchanged (no rolling needed)", () => {
    const future = "2026-08-15T09:00:00.000Z";
    const now = new Date("2026-06-01T00:00:00.000Z");
    expect(rollRenewalForward(future, "monthly", now)).toBe(future);
  });

  it("weekly: rolls an overdue date forward in exact 7-day increments", () => {
    const overdue = "2026-06-01T09:00:00.000Z"; // a Monday
    const now = new Date("2026-06-20T00:00:00.000Z");
    const result = rollRenewalForward(overdue, "weekly", now);
    expect(result).toBe("2026-06-22T09:00:00.000Z"); // next Monday on/after Jun 20
  });

  it("monthly: clamps Jan 31 to Feb 28 in a non-leap year rather than overflowing to Mar 3", () => {
    const overdue = "2025-01-31T00:00:00.000Z";
    const now = new Date("2025-02-15T00:00:00.000Z"); // today is before Feb 28
    expect(rollRenewalForward(overdue, "monthly", now)).toBe("2025-02-28T00:00:00.000Z");
  });

  it("monthly: clamps Jan 31 to Feb 29 in a leap year", () => {
    const overdue = "2028-01-31T00:00:00.000Z";
    const now = new Date("2028-02-15T00:00:00.000Z");
    expect(rollRenewalForward(overdue, "monthly", now)).toBe("2028-02-29T00:00:00.000Z");
  });

  it("monthly: rolls through a clamped month to land back on the anchor day once a long-enough month arrives", () => {
    const overdue = "2025-01-31T00:00:00.000Z";
    const now = new Date("2025-03-01T00:00:00.000Z"); // Feb 28 (clamped) is itself now overdue
    expect(rollRenewalForward(overdue, "monthly", now)).toBe("2025-03-31T00:00:00.000Z");
  });

  it("quarterly: steps forward by 3 months at a time", () => {
    const overdue = "2026-01-15T00:00:00.000Z";
    const now = new Date("2026-05-01T00:00:00.000Z");
    // Jan 15 -> Apr 15 (1 quarter) is still before May 1 -> Jul 15 (2 quarters)
    expect(rollRenewalForward(overdue, "quarterly", now)).toBe("2026-07-15T00:00:00.000Z");
  });

  it("annual: steps forward by 12 months at a time", () => {
    const overdue = "2024-06-01T00:00:00.000Z";
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(rollRenewalForward(overdue, "annual", now)).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("getDaysRemaining", () => {
  it("returns null for missing or invalid dates", () => {
    expect(getDaysRemaining(undefined)).toBeNull();
    expect(getDaysRemaining(null)).toBeNull();
    expect(getDaysRemaining("not-a-date")).toBeNull();
  });

  it("returns 0 for today", () => {
    expect(getDaysRemaining(new Date().toISOString())).toBe(0);
  });

  it("returns the correct whole-day count for a future date", () => {
    const future = new Date(Date.now() + 5 * DAY_MS).toISOString();
    expect(getDaysRemaining(future)).toBe(5);
  });

  it("clamps a past date to 0, never negative", () => {
    const past = new Date(Date.now() - 10 * DAY_MS).toISOString();
    expect(getDaysRemaining(past)).toBe(0);
  });
});
