import { describe, expect, it } from "vitest";
import { annualAmountMinor, billingSuffix } from "./billing-label";

describe("billingSuffix (F130, F131)", () => {
  it.each([
    ["monthly", "/month"],
    ["annual", "/year"],
    ["weekly", "/week"],
    ["quarterly", "/quarter"],
    ["trial", "/trial"],
    ["unknown", ""]
  ] as const)("%s: %j", (cycle, suffix) => {
    expect(billingSuffix(cycle)).toBe(suffix);
  });
});

describe("annualAmountMinor (F117, F139)", () => {
  it.each([
    ["monthly", 1200],
    ["annual", 100],
    ["weekly", 5200],
    ["quarterly", 400],
    ["trial", null],
    ["unknown", null]
  ] as const)("%s: a year of 100 is %j", (cycle, year) => {
    expect(annualAmountMinor(100, cycle)).toBe(year);
  });
});
