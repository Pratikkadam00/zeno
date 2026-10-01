import { CURRENCY_CODES } from "@zeno/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { currencySymbol, formatMoney } from "./format";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatMoney — integer minor units", () => {
  it("formats zero, negatives and thousands grouping", () => {
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(-1599, "USD")).toBe("-$15.99");
    expect(formatMoney(123456789, "USD")).toBe("$1,234,567.89");
    expect(formatMoney(1, "USD")).toBe("$0.01");
  });

  it("formats every supported currency with its own mark and two minor digits", () => {
    const formatted = Object.fromEntries(CURRENCY_CODES.map((code) => [code, formatMoney(123456, code)]));
    expect(formatted).toEqual({
      USD: "$1,234.56",
      EUR: "€1,234.56",
      GBP: "£1,234.56",
      INR: "₹1,234.56",
      // en-US disambiguates the other dollars in the full formatter…
      CAD: "CA$1,234.56",
      AUD: "A$1,234.56"
    });
  });
});

describe("currencySymbol", () => {
  it("uses the narrow symbol, so CAD and AUD read as '$' like USD", () => {
    expect(currencySymbol("CAD")).toBe("$");
    expect(currencySymbol("AUD")).toBe("$");
  });

  // Intl support differs by JS engine (Hermes on Android vs JSC on iOS). If an
  // engine returns no currency part, the ISO code is shown instead of nothing.
  it("falls back to the ISO code when the platform's Intl returns no currency part", () => {
    vi.spyOn(Intl.NumberFormat.prototype, "formatToParts").mockReturnValue([{ type: "integer", value: "0" }]);
    expect(currencySymbol("EUR")).toBe("EUR");
  });
});

