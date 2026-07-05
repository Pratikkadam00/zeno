import { describe, expect, it } from "vitest";
import { currencySymbol, formatMoney } from "./format";

describe("currencySymbol", () => {
  it("returns the correct narrow symbol per currency code", () => {
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("EUR")).toBe("€");
    expect(currencySymbol("GBP")).toBe("£");
  });

  it("defaults to USD's symbol when no currency is given", () => {
    expect(currencySymbol()).toBe("$");
  });
});

describe("formatMoney", () => {
  it("formats minor units with the right currency, not always $", () => {
    expect(formatMoney(999, "USD")).toBe("$9.99");
    expect(formatMoney(49900, "INR")).toBe("₹499.00");
  });

  it("defaults to USD when no currency is given", () => {
    expect(formatMoney(1000)).toBe("$10.00");
  });
});
