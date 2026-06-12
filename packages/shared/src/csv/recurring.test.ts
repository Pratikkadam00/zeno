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
});
