import { describe, expect, it } from "vitest";
import { parseCSV } from "./csvParser";

// These cases are about US bank formats and detection, not currency (F18 has
// its own tests): a fallback of USD keeps them as they were.
const parse = (content: string) => parseCSV(content, "USD");

// A bank export is untrusted input: every row can be malformed. These cover
// format detection for each supported bank, every reason a row is rejected,
// all four cadences, merchant-name cleanup, catalog matching and de-duplication.

const csv = (...lines: string[]) => lines.join("\n");
const monthly = (desc: string, amount: string, dates = ["2026-01-05", "2026-02-04", "2026-03-06"]) =>
  dates.map((d) => `${d},${desc},${amount}`);

describe("parseCSV — empty and header-only input", () => {
  it("empty or whitespace-only content", () => {
    expect(parse("")).toEqual({ subscriptions: [], totalRows: 0, detectedFormat: "Unknown" });
    expect(parse("\n , ,\n\n")).toEqual({ subscriptions: [], totalRows: 0, detectedFormat: "Unknown" });
  });

  it("a header with no data rows", () => {
    expect(parse("Date,Description,Amount")).toEqual({ subscriptions: [], totalRows: 0, detectedFormat: "Citi" });
  });

  it("counts data rows, ignoring blank lines", () => {
    const r = parse(csv("Date,Description,Amount", "", "2026-01-05,A,-1.00", " , , ", "2026-01-06,B,-1.00"));
    expect(r.totalRows).toBe(2);
  });
});

describe("parseCSV — bank format detection", () => {
  it("Capital One: 'Card No.' header, charges read from the Debit column", () => {
    const r = parse(csv(
      "Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit",
      "2026-01-05,2026-01-06,1234,NETFLIX.COM,Entertainment,15.49,",
      "2026-02-04,2026-02-05,1234,NETFLIX.COM,Entertainment,15.49,",
      "2026-02-10,2026-02-11,1234,REFUND,Other,,20.00"
    ));
    expect(r.detectedFormat).toBe("Capital One");
    expect(r.subscriptions.map((s) => s.name)).toEqual(["Netflix"]);
  });

  it("Bank of America: 'Running Bal.' header, signed Amount column", () => {
    const r = parse(csv("Date,Description,Amount,Running Bal.", ...monthly("SPOTIFY USA", "-11.99").map((l) => `${l},1000.00`)));
    expect(r.detectedFormat).toBe("Bank of America");
    expect(r.subscriptions).toHaveLength(1);
  });

  it("Chase: 'Transaction Date' or 'Posting Date' header", () => {
    expect(parse("Transaction Date,Post Date,Description,Category,Type,Amount").detectedFormat).toBe("Chase");
    expect(parse("Details,Posting Date,Description,Amount,Type,Balance").detectedFormat).toBe("Chase");
  });

  it("Wells Fargo: five cells with two '*' placeholders; date, amount, description by position", () => {
    const r = parse(csv(
      "01/01/2026,-1.00,*,*,HEADERLIKE FIRST ROW",
      "01/05/2026,-15.49,*,*,NETFLIX.COM",
      "02/04/2026,-15.49,*,*,NETFLIX.COM"
    ));
    expect(r.detectedFormat).toBe("Wells Fargo");
    expect(r.subscriptions.map((s) => [s.name, s.amount])).toEqual([["Netflix", 15.49]]);
  });

  it("Citi: exactly Date, Description, Amount", () => {
    expect(parse("Date,Description,Amount").detectedFormat).toBe("Citi");
    expect(parse("Date,Description,Amount,Memo").detectedFormat).toBe("Generic");
  });

  it("Generic: anything else, with positional defaults when names are missing (date=0, description=1)", () => {
    const r = parse(csv("When,What,Amount,Memo", ...monthly("NETFLIX.COM", "-15.49").map((l) => `${l},x`)));
    expect(r.detectedFormat).toBe("Generic");
    expect(r.subscriptions).toHaveLength(1);
  });
});

describe("parseCSV — row rejection", () => {
  const header = "Date,Description,Amount";
  const only = (...rows: string[]) => parse(csv(header, ...rows)).subscriptions;

  it("rows with an unparseable or missing date are skipped", () => {
    expect(only("not-a-date,NETFLIX,-15.49", "13/45/2026,NETFLIX,-15.49", ",NETFLIX,-15.49")).toEqual([]);
  });

  it("credits (positive amounts), zero and unparseable amounts are never charges", () => {
    expect(only(...monthly("PAYROLL", "2500.00"), ...monthly("ZERO", "0.00"), ...monthly("JUNK", "abc"))).toEqual([]);
  });

  it("a description that cleans down to nothing, or a row too short to have one, is skipped", () => {
    expect(only(...monthly("12345678", "-9.99"))).toEqual([]);
    expect(parse(csv("Date,Amount,Description", "2026-01-05,-9.99", "2026-02-04,-9.99")).subscriptions).toEqual([]);
  });

  it("an empty Debit cell falls back to a negative Amount", () => {
    const r = parse(csv("Date,Description,Debit,Amount", "2026-01-05,NETFLIX.COM,,-15.49", "2026-02-04,NETFLIX.COM,,-15.49"));
    expect(r.subscriptions).toHaveLength(1);
  });
});

describe("parseCSV — recurrence", () => {
  const header = "Date,Description,Amount";

  it("one charge is not a subscription", () => {
    expect(parse(csv(header, "2026-01-05,NETFLIX.COM,-15.49")).subscriptions).toEqual([]);
  });

  it("amounts that are not similar (beyond 10% / $1) are not a subscription", () => {
    expect(parse(csv(header, "2026-01-05,ZZQX MART,-15.00", "2026-02-04,ZZQX MART,-100.00")).subscriptions).toEqual([]);
  });

  it("gaps that match no cadence are not a subscription", () => {
    expect(parse(csv(header, "2026-01-05,ZZQX MART,-15.00", "2026-01-20,ZZQX MART,-15.00")).subscriptions).toEqual([]);
  });

  it("weekly, monthly, quarterly and annual cadences", () => {
    const cycle = (dates: string[]) => parse(csv(header, ...dates.map((d) => `${d},ZZQX CLUB,-9.00`))).subscriptions[0]?.billingCycle;
    expect(cycle(["2026-01-05", "2026-01-12"])).toBe("weekly");
    expect(cycle(["2026-01-05", "2026-02-04"])).toBe("monthly");
    expect(cycle(["2026-01-05", "2026-04-05"])).toBe("quarterly");
    expect(cycle(["2025-01-05", "2026-01-06"])).toBe("annual");
  });

  it("a catalog match gives high confidence, the catalog name and cancel URL; the average amount is kept to cents", () => {
    const [s] = parse(csv(header, "2026-01-05,NETFLIX.COM,-15.49", "2026-02-04,NETFLIX.COM,-15.50")).subscriptions;
    expect(s).toMatchObject({ name: "Netflix", serviceId: "netflix", confidence: "high", amount: 15.5, currency: "USD", billingCycle: "monthly" });
    expect(s!.cancelUrl).toMatch(/^https:\/\//);
    expect(s!.lastCharged).toBe(new Date(Date.parse("2026-02-04")).toISOString());
  });

  it("no catalog match: medium confidence, the cleaned description as the name", () => {
    const [s] = parse(csv(header, "2026-01-05,ZZQX CLUB,-9.00", "2026-02-04,ZZQX CLUB,-9.00")).subscriptions;
    expect(s).toMatchObject({ name: "Zzqx Club", rawMerchant: "Zzqx Club", confidence: "medium", serviceId: undefined });
  });
});

describe("parseCSV — merchant cleanup and de-duplication", () => {
  const header = "Date,Description,Amount";
  const nameOf = (raw: string) => parse(csv(header, `2026-01-05,${raw},-9.00`, `2026-02-04,${raw},-9.00`)).subscriptions[0]?.rawMerchant;

  it("strips payment-processor prefixes, TLDs, card suffixes, long digit runs and trailing locations", () => {
    expect(nameOf("SQ *ZZQX CAFE")).toBe("Zzqx Cafe");
    expect(nameOf("TST* ZZQX DINER")).toBe("Zzqx Diner");
    expect(nameOf("PAYPAL *ZZQXSTORE")).toBe("Zzqxstore");
    expect(nameOf("APL* ZZQX PLUS")).toBe("Zzqx Plus");
    expect(nameOf("ZZQXAPP.COM")).toBe("Zzqxapp");
    expect(nameOf("ZZQX GYM card 1234")).toBe("Zzqx Gym");
    expect(nameOf("ZZQX GYM 88812345")).toBe("Zzqx Gym");
    expect(nameOf("ZZQX GYM - CA")).toBe("Zzqx Gym");
  });

  it("F20: a meaningful last word is kept, so the right catalog entry matches (APPLE MUSIC is Apple Music, not 'Apple')", () => {
    expect(nameOf("APPLE MUSIC")).toBe("Apple Music");
    expect(nameOf("DISNEY PLUS")).toBe("Disney Plus");
    expect(nameOf("ZZQX CLUB")).toBe("Zzqx Club");
    expect(nameOf("SPOTIFY USA")).toBe("Spotify");
    expect(nameOf("ZZQX GYM LOS GATOS CA")).toBe("Zzqx Gym Los Gatos");
    expect(nameOf("ZZQX GYM NY US")).toBe("Zzqx Gym");
    const [s] = parse(csv(header, "2026-01-05,APPLE MUSIC,-10.99", "2026-02-04,APPLE MUSIC,-10.99")).subscriptions;
    expect(s!.serviceId).toBe("apple-music");
  });

  it("F20: two different services from the same company stay two subscriptions", () => {
    const subs = parse(csv(
      header,
      "2026-01-05,ZZQX MUSIC,-10.99", "2026-02-04,ZZQX MUSIC,-10.99",
      "2026-01-06,ZZQX CLOUD,-2.99", "2026-02-05,ZZQX CLOUD,-2.99"
    )).subscriptions;
    expect(subs.map((x) => [x.rawMerchant, x.amount])).toEqual([["Zzqx Music", 10.99], ["Zzqx Cloud", 2.99]]);
  });

  it("descriptions that resolve to the same service collapse to one, keeping the larger amount", () => {
    const subs = parse(csv(
      header,
      "2026-01-05,NETFLIX.COM,-15.49", "2026-02-04,NETFLIX.COM,-15.49",
      "2026-01-07,NETFLIX STREAMING,-22.99", "2026-02-06,NETFLIX STREAMING,-22.99"
    )).subscriptions;
    const netflix = subs.filter((s) => s.serviceId === "netflix");
    expect(netflix).toHaveLength(1);
    expect(netflix[0]!.amount).toBe(22.99);
  });

  it("results are ordered by confidence, then amount", () => {
    const subs = parse(csv(
      header,
      "2026-01-05,ZZQX CLUB,-50.00", "2026-02-04,ZZQX CLUB,-50.00",
      "2026-01-05,NETFLIX.COM,-15.49", "2026-02-04,NETFLIX.COM,-15.49",
      "2026-01-06,ZZQX MINI,-5.00", "2026-02-05,ZZQX MINI,-5.00"
    )).subscriptions;
    expect(subs.map((s) => s.confidence)).toEqual(["high", "medium", "medium"]);
    expect(subs.slice(1).map((s) => s.amount)).toEqual([50, 5]);
  });
});

describe("parseCSV — de-duplication keeps the better entry either way round", () => {
  it("a later, smaller match for the same service does not replace the larger one", () => {
    const subs = parse(csv(
      "Date,Description,Amount",
      "2026-01-07,NETFLIX STREAMING,-22.99", "2026-02-06,NETFLIX STREAMING,-22.99",
      "2026-01-05,NETFLIX.COM,-15.49", "2026-02-04,NETFLIX.COM,-15.49"
    )).subscriptions;
    const netflix = subs.filter((s) => s.serviceId === "netflix");
    expect(netflix).toHaveLength(1);
    expect(netflix[0]!.amount).toBe(22.99);
  });
});

describe("F18: a detection's currency is the file's, never an unfounded USD", () => {
  const generic = (amount: string) => csv("When,What,Amount,Memo", ...monthly("NETFLIX.COM", amount).map((l) => `${l},x`));

  it.each([
    ["-€15.49", "EUR"],
    ["EUR -15.49", "EUR"],
    ["-£9.99", "GBP"],
    ["-₹499", "INR"],
    ["Rs. -499", "INR"],
    ["CA$-12.00", "CAD"],
    ["A$-12.00", "AUD"],
    ["-$15.49", "USD"]
  ] as const)("a Generic file with amounts like %s is %s", (amount, currency) => {
    const r = parseCSV(generic(amount), "GBP");
    expect(r.detectedFormat).toBe("Generic");
    expect(r.subscriptions.map((s) => s.currency)).toEqual([currency]);
  });

  it("a Generic file of bare numbers takes the fallback (the app passes the home currency), not USD", () => {
    expect(parseCSV(generic("-15.49"), "INR").subscriptions.map((s) => s.currency)).toEqual(["INR"]);
    expect(parseCSV(generic("-15.49"), "EUR").subscriptions.map((s) => s.currency)).toEqual(["EUR"]);
  });

  it("the five US bank formats stay USD whatever the fallback (the format itself says USD)", () => {
    const chase = csv("Transaction Date,Post Date,Description,Category,Type,Amount", ...["2026-01-05", "2026-02-04", "2026-03-06"].map((d) => `${d},${d},NETFLIX.COM,Ent,Sale,-15.49`));
    const r = parseCSV(chase, "INR");
    expect(r.detectedFormat).toBe("Chase");
    expect(r.subscriptions.map((s) => s.currency)).toEqual(["USD"]);
  });

  it("a ragged row shorter than the money column neither breaks detection nor changes the currency", () => {
    const r = parseCSV(csv("When,What,Memo,Amount", "2026-04-01,SHORT ROW", ...monthly("NETFLIX.COM", "x").map((l) => l.replace(",x", ",memo,-€15.49"))), "INR");
    expect(r.subscriptions.map((s) => s.currency)).toEqual(["EUR"]);
  });

  it("only money cells count: a currency word in the description does not change it", () => {
    const r = parseCSV(csv("When,What,Amount,Memo", ...monthly("EUR TRAVEL CLUB", "-15.49").map((l) => `${l},paid in GBP`)), "INR");
    expect(r.subscriptions.map((s) => s.currency)).toEqual(["INR"]);
  });
});
