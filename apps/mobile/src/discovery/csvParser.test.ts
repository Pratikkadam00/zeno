import { describe, expect, it } from "vitest";
import { parseCSV } from "./csvParser";

describe("parseCSV", () => {
  it("detects recurring monthly charges from a generic bank export", () => {
    const csv = [
      "Date,Description,Amount",
      "2026-01-05,NETFLIX.COM,-15.49",
      "2026-02-04,NETFLIX.COM,-15.49",
      "2026-03-06,NETFLIX.COM,-15.49",
      "2026-03-07,COFFEE SHOP,-4.25"
    ].join("\n");

    const result = parseCSV(csv);

    expect(result.detectedFormat).toBe("Citi");
    expect(result.totalRows).toBe(4);
    expect(result.subscriptions).toHaveLength(1);
    expect(result.subscriptions[0]).toMatchObject({
      name: "Netflix",
      amount: 15.49,
      billingCycle: "monthly",
      confidence: "high"
    });
  });

  it("detects weekly recurring charges", () => {
    const csv = [
      "Date,Description,Amount",
      "2026-01-02,BLUE APRON,-11.99",
      "2026-01-09,BLUE APRON,-11.99",
      "2026-01-16,BLUE APRON,-11.99"
    ].join("\n");

    const result = parseCSV(csv);

    expect(result.subscriptions).toHaveLength(1);
    expect(result.subscriptions[0]?.billingCycle).toBe("weekly");
  });

  it("uses debit columns as charges for Capital One style exports", () => {
    const csv = [
      "Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit",
      "2026-01-10,2026-01-11,1234,Spotify,Entertainment,10.99,",
      "2026-02-09,2026-02-10,1234,Spotify,Entertainment,10.99,",
      "2026-03-11,2026-03-12,1234,Spotify,Entertainment,10.99,"
    ].join("\n");

    const result = parseCSV(csv);

    expect(result.detectedFormat).toBe("Capital One");
    expect(result.subscriptions[0]).toMatchObject({
      name: "Spotify",
      billingCycle: "monthly"
    });
  });
});

