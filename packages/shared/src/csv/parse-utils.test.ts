import { describe, expect, it } from "vitest";
import { parseAmountMinor } from "./parse-utils";

describe("parseAmountMinor", () => {
  it("parses plain decimals to minor units", () => {
    expect(parseAmountMinor("12.50")).toBe(1250);
    expect(parseAmountMinor("10")).toBe(1000);
    expect(parseAmountMinor("0.99")).toBe(99);
  });

  it("strips currency symbols and US thousands separators", () => {
    expect(parseAmountMinor("$1,234.56")).toBe(123456);
    expect(parseAmountMinor("  $ 49.99 ")).toBe(4999);
    expect(parseAmountMinor("1,234,567.89")).toBe(123456789);
  });

  it("handles EU comma-decimal and dot-thousands formats", () => {
    expect(parseAmountMinor("10,50")).toBe(1050);        // comma decimal
    expect(parseAmountMinor("1.234,56")).toBe(123456);   // de-DE
    expect(parseAmountMinor("1,000")).toBe(100000);      // comma as thousands
  });

  it("rounds correctly without binary float error", () => {
    expect(parseAmountMinor("1.005")).toBe(101); // 1.005 * 100 would floor to 100
    expect(parseAmountMinor("2.675")).toBe(268);
  });

  it("treats parentheses and leading minus as negative", () => {
    expect(parseAmountMinor("(10.50)")).toBe(-1050);
    expect(parseAmountMinor("-10.50")).toBe(-1050);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseAmountMinor("")).toBeNull();
    expect(parseAmountMinor(undefined)).toBeNull();
    expect(parseAmountMinor("   ")).toBeNull();
    expect(parseAmountMinor("abc")).toBeNull();
  });

  it("rejects an implausibly large amount instead of silently rounding it to a large-but-finite value", () => {
    // Number.parseInt doesn't overflow to Infinity until 400+ digits — short
    // of that, an adversarial/malformed CSV field would otherwise parse to a
    // large, finite (if imprecise) number rather than being rejected.
    expect(parseAmountMinor("99999999999999999999999999.99")).toBeNull();
    // A merely large-but-real amount (well under the plausibility cap) still works.
    expect(parseAmountMinor("9,999,999.99")).toBe(999999999);
  });
});
