import { describe, expect, it } from "vitest";
import { importOutcomeMessage, parseCSV } from "./csvParser";

/**
 * F245: what someone is told when their file produced no subscriptions. The
 * three cases are the three ways it happens, and each message says which.
 */
describe("importOutcomeMessage", () => {
  it("an empty file, or one with a header and nothing under it, has no rows", () => {
    for (const content of ["", "\n\n", "Date,Description,Amount\n"]) {
      const result = parseCSV(content, "USD");
      expect(result.chargeCount).toBe(0);
      expect(importOutcomeMessage(result)).toBe(
        "That file has no statement rows in it. Export the statement from your bank again and pick the new file."
      );
    }
  });

  it("rows without an amount give no charges, and the message names the three things each row needs", () => {
    const csv = ["Date,Description,Category", "2026-07-05,NETFLIX.COM,Entertainment", "2026-08-05,NETFLIX.COM,Entertainment"].join("\n");
    const result = parseCSV(csv, "USD");
    expect(result.totalRows).toBe(2);
    expect(result.chargeCount).toBe(0);
    expect(importOutcomeMessage(result)).toMatch(/^No charges found in that file\. Zeno reads a date, a description and an amount/);
  });

  it("charges that never repeat are counted, and the rule for a subscription is stated", () => {
    const one = parseCSV(["Date,Description,Amount", "2026-07-05,CORNER BAKERY,-8.20"].join("\n"), "USD");
    expect(one.chargeCount).toBe(1);
    expect(importOutcomeMessage(one)).toBe(
      "Read 1 charge, none of them recurring. A subscription needs the same merchant charging a similar amount at least twice, so a longer statement may find more."
    );
    const two = parseCSV(["Date,Description,Amount", "2026-07-05,CORNER BAKERY,-8.20", "2026-07-09,HARDWARE STORE,-42.00"].join("\n"), "USD");
    expect(two.chargeCount).toBe(2);
    expect(importOutcomeMessage(two)).toMatch(/^Read 2 charges, none of them recurring\./);
  });

  it("is null when the file found something, so success keeps its own path", () => {
    const csv = ["Date,Description,Amount", "2026-01-05,NETFLIX.COM,-15.49", "2026-02-04,NETFLIX.COM,-15.49", "2026-03-06,NETFLIX.COM,-15.49"].join("\n");
    const result = parseCSV(csv, "USD");
    expect(result.subscriptions.length).toBeGreaterThan(0);
    expect(result.chargeCount).toBe(3);
    expect(importOutcomeMessage(result)).toBeNull();
  });

  it("the stated rule is the parser's real rule: the same merchant twice at a similar amount is enough", () => {
    const twice = parseCSV(["Date,Description,Amount", "2026-07-05,ZZQX STREAMS,-9.99", "2026-08-04,ZZQX STREAMS,-9.99"].join("\n"), "USD");
    expect(twice.subscriptions).toHaveLength(1);
    expect(importOutcomeMessage(twice)).toBeNull();
  });
});
