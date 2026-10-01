import { describe, expect, it } from "vitest";
import { isAmountText } from "./amount-text";

describe("isAmountText (F113, F122)", () => {
  it.each(["9", "9.", "9.9", "9.99", "0", "1500", " 12.50 "])("accepts %j", (text) => {
    expect(isAmountText(text)).toBe(true);
  });

  // Each of these parseFloat read as a number the user never typed.
  it.each(["", " ", "1,99", "9.99.9", "1e3", "9.999", "-5", ".5", "$9", "abc", "9 99"])("rejects %j", (text) => {
    expect(isAmountText(text)).toBe(false);
  });
});
