import { describe, expect, it } from "vitest";
import { budgetRecap } from "./budget";

// Six UTC months ending in the current one (Oct 2026), as buildMonthlySpendHistory gives them.
const NOW = new Date("2026-10-15T12:00:00.000Z");
const months = (amounts: number[]) => amounts.map((amountMinor, i) => ({ year: 2026, month: 4 + i, amountMinor })); // May..Oct

describe("budgetRecap (F143)", () => {
  it("a cap set today: no recap at all (no complete month under it yet), so no streak to share", () => {
    expect(budgetRecap(months([0, 0, 0, 0, 0, 0]), 5000, "2026-10-15T09:00:00.000Z", NOW)).toBeNull();
  });

  it("a cap set during last month: still none, that month was not a full month under it", () => {
    expect(budgetRecap(months([0, 0, 0, 0, 100, 100]), 5000, "2026-09-03T00:00:00.000Z", NOW)).toBeNull();
  });

  it("a cap set before September: September is the recap; the streak counts only months after the cap", () => {
    expect(budgetRecap(months([0, 0, 0, 100, 100, 100]), 5000, "2026-08-01T00:00:00.000Z", NOW)).toEqual({ recapIndex: 4, streak: 2 });
    expect(budgetRecap(months([0, 0, 0, 100, 100, 100]), 5000, "2026-07-20T00:00:00.000Z", NOW)).toEqual({ recapIndex: 4, streak: 2 });
  });

  it("a month over the cap ends the streak; a recap month over the cap has none", () => {
    expect(budgetRecap(months([100, 100, 9000, 100, 100, 0]), 5000, "2026-01-01T00:00:00.000Z", NOW)).toEqual({ recapIndex: 4, streak: 2 });
    expect(budgetRecap(months([100, 100, 100, 100, 9000, 0]), 5000, "2026-01-01T00:00:00.000Z", NOW)).toEqual({ recapIndex: 4, streak: 0 });
  });

  it("an old cap: every complete month counts, the current one never does", () => {
    expect(budgetRecap(months([100, 100, 100, 100, 100, 100]), 5000, "2025-01-01T00:00:00.000Z", NOW)).toEqual({ recapIndex: 4, streak: 5 });
  });

  it("no date, or an unreadable one: no recap (never a guess)", () => {
    expect(budgetRecap(months([100, 100, 100, 100, 100, 100]), 5000, null, NOW)).toBeNull();
    expect(budgetRecap(months([100, 100, 100, 100, 100, 100]), 5000, "not a date", NOW)).toBeNull();
  });

  it("the current time defaults to now", () => {
    expect(budgetRecap([], 5000, "2026-01-01T00:00:00.000Z")).toBeNull();
  });
});
