import { describe, expect, it } from "vitest";
import { parseCSV } from "./csvParser";

// P6.3: Stryker changed each of these and no test noticed: which bank layout a
// file is read as, which column is the date, what counts as a charge, the day
// windows that make a cycle, the order charges arrive in, and how a card
// descriptor is cleaned into a merchant name. Merchant names here are made up
// ("Zzqx ...") so the service catalogue can't rename them.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const dayAfter = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** A signed-amount file (Generic): one charge per date, all -12.00. */
function charges(merchant: string, days: string[]) {
  return csv([["Date", "Description", "Amount", "Category"], ...days.map((d) => [d, merchant, "-12.00", "Subscriptions"])]);
}
const cycleOf = (days: string[]) => parseCSV(charges("ZZQX STREAMS", days), "USD").subscriptions[0]?.billingCycle ?? "none";
const gapsFrom = (start: string, gaps: number[]) => gaps.reduce((days, gap) => [...days, dayAfter(days[days.length - 1]!, gap)], [start]);

describe("which bank layout a file is read as", () => {
  it("Wells Fargo: no header, five columns, two of them '*'", () => {
    const rows = [0, 30, 60].map((d) => [dayAfter("2026-01-05", d), "-9.99", "*", "*", "ZZQX CLUB"]);
    const result = parseCSV(csv(rows), "EUR");
    expect(result.detectedFormat).toBe("Wells Fargo");
    // Its first row is taken as the header; the other two still make a monthly plan, in USD.
    expect(result.subscriptions).toEqual([expect.objectContaining({ name: "Zzqx Club", amount: 9.99, billingCycle: "monthly", currency: "USD" })]);
  });

  it("Citi: exactly Date, Description, Amount, in any order, read by name", () => {
    const rows = [["Description", "Amount", "Date"], ...[0, 30].map((d) => ["ZZQX CLUB", "-5.00", dayAfter("2026-02-01", d)])];
    const result = parseCSV(csv(rows), "USD");
    expect(result.detectedFormat).toBe("Citi");
    expect(result.subscriptions[0]).toMatchObject({ name: "Zzqx Club", lastCharged: "2026-03-03T00:00:00.000Z" });
  });

  it("anything else is Generic, and takes the fallback currency when its amounts show none", () => {
    const result = parseCSV(charges("ZZQX STREAMS", ["2026-01-01", "2026-01-31"]), "INR");
    expect(result.detectedFormat).toBe("Generic");
    expect(result.subscriptions[0]?.currency).toBe("INR");
  });
});

describe("what counts as a charge", () => {
  it("a debit column: a positive debit is a charge, a zero debit is not", () => {
    const rows = [
      ["Date", "Description", "Debit", "Credit"],
      ["2026-01-01", "ZZQX GYM", "20.00", ""],
      ["2026-01-31", "ZZQX GYM", "20.00", ""],
      ["2026-01-01", "ZZQX FREE", "0.00", ""],
      ["2026-01-31", "ZZQX FREE", "0.00", ""]
    ];
    expect(parseCSV(csv(rows), "USD").subscriptions.map((s) => s.name)).toEqual(["Zzqx Gym"]);
  });

  it("a signed amount: negative is money out; positive is a credit, never a charge", () => {
    const rows = [
      ["Date", "Description", "Amount", "Category"],
      ["2026-01-01", "ZZQX REFUNDS", "12.00", "x"],
      ["2026-01-31", "ZZQX REFUNDS", "12.00", "x"]
    ];
    expect(parseCSV(csv(rows), "USD").subscriptions).toEqual([]);
  });
});

describe("the day windows that make a cycle (both edges, and one day outside)", () => {
  it.each([
    [[5], "weekly"], [[9], "weekly"], [[4], "none"], [[10], "none"],
    [[25], "monthly"], [[35], "monthly"], [[24], "none"], [[36], "none"],
    [[85], "quarterly"], [[95], "quarterly"], [[84], "none"], [[96], "none"],
    [[360], "annual"], [[375], "annual"], [[359], "none"], [[376], "none"]
  ])("a gap of %j days: %s", (gaps, cycle) => {
    expect(cycleOf(gapsFrom("2025-01-01", gaps))).toBe(cycle);
  });

  it("one regular gap is enough, even if another is irregular", () => {
    expect(cycleOf(gapsFrom("2026-01-01", [30, 200]))).toBe("monthly");
  });
});

describe("grouping charges into a subscription", () => {
  it("charges listed out of order are read in date order: the last charge is the latest date", () => {
    const sub = parseCSV(charges("ZZQX STREAMS", ["2026-03-02", "2026-01-01", "2026-01-31"]), "USD").subscriptions[0];
    expect(sub).toMatchObject({ billingCycle: "monthly", lastCharged: "2026-03-02T00:00:00.000Z" });
  });

  it("a single charge is not a subscription", () => {
    expect(parseCSV(charges("ZZQX ONCE", ["2026-01-01"]), "USD").subscriptions).toEqual([]);
  });

  it("two charges more than 10 % apart are not one plan", () => {
    const rows = [["Date", "Description", "Amount", "Category"], ["2026-01-01", "ZZQX SHOP", "-10.00", "x"], ["2026-01-31", "ZZQX SHOP", "-30.00", "x"]];
    expect(parseCSV(csv(rows), "USD").subscriptions).toEqual([]);
  });
});

describe("card descriptors cleaned into a merchant name", () => {
  it.each([
    ["SQ *ZZQX GYM", "Zzqx Gym"],
    ["TST* ZZQX CAFE", "Zzqx Cafe"],
    ["PAYPAL *ZZQX MUSIC", "Zzqx Music"],
    ["APL*ZZQX TOOLS", "Zzqx Tools"],
    ["SP ZZQX SHOP", "Zzqx Shop"],
    ["ZZQX CLOUD card 1234", "Zzqx Cloud"],
    ["ZZQX CLOUD ending in 9876", "Zzqx Cloud"],
    ["ZZQX   CLOUD", "Zzqx Cloud"]
  ])("%s → %s", (descriptor, name) => {
    expect(parseCSV(charges(descriptor, ["2026-01-01", "2026-01-31"]), "USD").subscriptions[0]?.name).toBe(name);
  });
});
