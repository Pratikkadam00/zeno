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
});
