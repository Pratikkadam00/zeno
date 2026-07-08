import { describe, expect, it } from "vitest";
import { detectRecurringCharges, mapBankRows, parseCsv } from "./recurring";

describe("CSV recurring detector", () => {
  it("detects monthly subscriptions with amount tolerance", () => {
    const rows = parseCsv([
      "Date,Description,Amount",
      "2026-01-02,Midjourney Inc,-10.00",
      "2026-02-02,Midjourney Subscription,-10.49",
      "2026-03-03,Midjourney,-10.00",
      "2026-01-08,Coffee Shop,-6.00"
    ].join("\n"));

    const transactions = mapBankRows(rows);
    const candidates = detectRecurringCharges(transactions);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.normalizedMerchant).toBe("midjourney");
    expect(candidates[0]?.billingCycle).toBe("monthly");
    expect(candidates[0]?.suggestedCategory).toBe("ai_tools");
  });

  it("clamps monthly projections from Jan 31 to the end of February", () => {
    const rows = parseCsv([
      "Date,Description,Amount",
      "2025-12-31,Notion,-12.00",
      "2026-01-31,Notion,-12.00"
    ].join("\n"));

    const candidates = detectRecurringCharges(mapBankRows(rows));

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.billingCycle).toBe("monthly");
    expect(candidates[0]?.nextRenewalDate).toBe("2026-02-28T00:00:00.000Z");
  });

  it("clamps monthly projections from Jan 31 to Feb 29 in leap years", () => {
    const rows = parseCsv([
      "Date,Description,Amount",
      "2027-12-31,Notion,-12.00",
      "2028-01-31,Notion,-12.00"
    ].join("\n"));

    const candidates = detectRecurringCharges(mapBankRows(rows));

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.billingCycle).toBe("monthly");
    expect(candidates[0]?.nextRenewalDate).toBe("2028-02-29T00:00:00.000Z");
  });

  it("clamps annual projections from Feb 29 to Feb 28 of the next year", () => {
    const rows = parseCsv([
      "Date,Description,Amount",
      "2027-02-28,Dropbox,-119.88",
      "2028-02-29,Dropbox,-119.88"
    ].join("\n"));

    const candidates = detectRecurringCharges(mapBankRows(rows));

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.billingCycle).toBe("annual");
    expect(candidates[0]?.nextRenewalDate).toBe("2029-02-28T00:00:00.000Z");
  });

  it("skips rows with an unparseable date instead of throwing", () => {
    const rows = parseCsv([
      "Date,Description,Amount",
      "not-a-date,Netflix,-15.49",
      "2026-13-40,Netflix,-15.49",
      "2026-01-05,Netflix,-15.49",
      "2026-02-05,Netflix,-15.49"
    ].join("\n"));

    const transactions = mapBankRows(rows);

    // The two bad-date rows are dropped; only the two valid rows survive.
    expect(transactions).toHaveLength(2);
    expect(transactions.map((item) => item.postedAt)).toEqual([
      "2026-01-05T00:00:00.000Z",
      "2026-02-05T00:00:00.000Z"
    ]);
  });

  it("parses dates in UTC so the calendar day is timezone-stable", () => {
    const rows = parseCsv([
      "Date,Description,Amount",
      "01/02/2026,Spotify,-9.99"
    ].join("\n"));

    const transactions = mapBankRows(rows);

    // Slash dates are interpreted as US MM/DD/YYYY and anchored to UTC midnight,
    // so the day never shifts regardless of the local timezone.
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.postedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("classifies cadence by the median interval, ignoring an outlier gap", () => {
    // Roughly monthly spacing with one large gap (a missed charge). The mean
    // interval would be pulled toward "unknown"/annual, but the median stays
    // monthly.
    const rows = parseCsv([
      "Date,Description,Amount",
      "2026-01-01,Figma,-15.00",
      "2026-02-01,Figma,-15.00",
      "2026-03-01,Figma,-15.00",
      "2026-09-01,Figma,-15.00",
      "2026-10-01,Figma,-15.00"
    ].join("\n"));

    const candidates = detectRecurringCharges(mapBankRows(rows));

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.billingCycle).toBe("monthly");
  });

  it("preserves every column when header names are duplicated", () => {
    const rows = parseCsv([
      "Date,Amount,Amount",
      "2026-01-05,first,second"
    ].join("\n"));

    // The second "Amount" column is suffixed rather than overwriting the first,
    // so no column value is lost.
    expect(rows[0]).toEqual({ Date: "2026-01-05", Amount: "first", Amount_2: "second" });
  });

  it("does not let a generated suffix collide with a genuinely different column of that exact name", () => {
    // A 3rd "Amount" duplicate would naively be suffixed "_2" (its own repeat
    // count), colliding with the SECOND column's real, pre-existing "Amount_2"
    // name and silently overwriting its data via Object.fromEntries.
    const rows = parseCsv([
      "Amount,Amount_2,Amount",
      "first,second,third"
    ].join("\n"));

    expect(rows[0]).toEqual({ Amount: "first", Amount_2: "second", Amount_3: "third" });
  });

  it("does not merge far-apart amounts into one cluster", () => {
    // Two distinct charges under one merchant: ~$10 and ~$50. A non-transitive
    // tolerance could chain them together; a stable single-reference window must
    // keep them separate (neither cluster reaches the 2-occurrence threshold on
    // its own here, so nothing recurring should be reported).
    const rows = parseCsv([
      "Date,Description,Amount",
      "2026-01-01,Acme,-10.00",
      "2026-02-01,Acme,-30.00",
      "2026-03-01,Acme,-50.00"
    ].join("\n"));

    const candidates = detectRecurringCharges(mapBankRows(rows));

    expect(candidates).toHaveLength(0);
  });
});
