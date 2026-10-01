import { describe, expect, it } from "vitest";
import { isIsoDay } from "./iso-day";

describe("isIsoDay (F115)", () => {
  it.each(["2026-10-02", "2028-02-29", "2026-12-31", "2026-01-01"])("accepts the real day %s", (day) => {
    expect(isIsoDay(day)).toBe(true);
  });

  it.each([
    ["30 February (Date.parse makes it 2 March)", "2026-02-30"],
    ["29 February in a non-leap year", "2026-02-29"],
    ["31 April (Date.parse makes it 1 May)", "2026-04-31"],
    ["month 13", "2026-13-01"],
    ["day 00", "2026-10-00"],
    ["a partial date", "2026-1"],
    ["a missing digit", "2026-10-0"],
    ["the empty string", ""],
    ["a slash date", "10/02/2026"],
    ["trailing text", "2026-10-02x"]
  ])("rejects %s", (_name, text) => {
    expect(isIsoDay(text)).toBe(false);
  });
});
