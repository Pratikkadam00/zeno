import { describe, expect, it } from "vitest";
import { csvSafeCell } from "./csv-export";

describe("csvSafeCell", () => {
  it("passes ordinary merchant names through unchanged (just CSV-quoted)", () => {
    expect(csvSafeCell("Netflix")).toBe('"Netflix"');
    expect(csvSafeCell("Adobe Creative Cloud")).toBe('"Adobe Creative Cloud"');
  });

  it("escapes embedded double quotes", () => {
    expect(csvSafeCell('Bob\'s "Streaming" Co')).toBe('"Bob\'s ""Streaming"" Co"');
  });

  // Concrete CSV/formula-injection payloads a bank-statement CSV or billing
  // email could carry through discovery parsing verbatim (csvParser.ts /
  // emailScanner.ts do not sanitize leading formula characters).
  it("neutralizes a leading '=' formula payload", () => {
    const result = csvSafeCell('=HYPERLINK("http://evil.example","x")');
    expect(result.startsWith("\"'=")).toBe(true);
    expect(result).not.toMatch(/^"=/);
  });

  it("neutralizes a leading '+' / '-' / '@' formula trigger", () => {
    expect(csvSafeCell("+1+1")).toBe('"\'+1+1"');
    expect(csvSafeCell("-2+3")).toBe('"\'-2+3"');
    expect(csvSafeCell("@SUM(1,2)")).toBe('"\'@SUM(1,2)"');
  });

  it("neutralizes a leading tab or carriage return", () => {
    expect(csvSafeCell("\t=cmd|calc")).toBe('"\'\t=cmd|calc"');
    expect(csvSafeCell("\r=cmd|calc")).toBe('"\'\r=cmd|calc"');
  });

  it("does not guard a value that merely contains '=' mid-string", () => {
    // Only a LEADING trigger character is a live formula in a spreadsheet cell.
    expect(csvSafeCell("Price=Fixed")).toBe('"Price=Fixed"');
  });
});
