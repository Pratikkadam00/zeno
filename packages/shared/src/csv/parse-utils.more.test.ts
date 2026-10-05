import { describe, expect, it } from "vitest";
import { normalizeMerchant, parseAmountMinor, parseCsvRows } from "./parse-utils";

// Bank exports are UNTRUSTED input: every case below is a shape a real (or a
// hostile) file can take. The parser must never invent, drop or re-sign data.

// Invisible characters, built from code points so the source stays readable.
const BOM = String.fromCharCode(0xfeff);
const NBSP = String.fromCharCode(0x00a0);
const MINUS = String.fromCharCode(0x2212); // U+2212 MINUS SIGN

describe("parseCsvRows", () => {
  it("a quoted field after padding spaces or a tab still protects its comma (common exporter shape)", () => {
    expect(parseCsvRows('Date, Description, Amount\n2026-09-01, "Netflix, Inc.", 15.49\n2026-09-02,\t"Hulu, LLC",7.99')).toEqual([
      ["Date", " Description", " Amount"],
      ["2026-09-01", "Netflix, Inc.", " 15.49"],
      ["2026-09-02", "Hulu, LLC", "7.99"]
    ]);
  });

  it("a quote after any non-space character stays literal (the padding rule does not reopen the swallow bug)", () => {
    expect(parseCsvRows('2026-09-01, BEST BUY 55" TV, 499.00\n2026-09-02,Spotify,9.99')).toEqual([
      ["2026-09-01", " BEST BUY 55\" TV", " 499.00"],
      ["2026-09-02", "Spotify", "9.99"]
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsvRows("")).toEqual([]);
  });

  it("splits on LF, CRLF and a lone CR, without an extra row for a trailing newline", () => {
    expect(parseCsvRows("a,b\nc,d\n")).toEqual([["a", "b"], ["c", "d"]]);
    expect(parseCsvRows("a,b\r\nc,d\r\n")).toEqual([["a", "b"], ["c", "d"]]);
    expect(parseCsvRows("a,b\rc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("keeps the last row when the input has no trailing newline", () => {
    expect(parseCsvRows("a,b\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("keeps empty cells, including a trailing delimiter", () => {
    expect(parseCsvRows("a,,c,\n")).toEqual([["a", "", "c", ""]]);
    expect(parseCsvRows(",")).toEqual([["", ""]]);
  });

  it("returns a blank line as a single empty cell (callers filter blank rows)", () => {
    expect(parseCsvRows("a\n\nb\n")).toEqual([["a"], [""], ["b"]]);
  });

  it("keeps delimiters and line breaks that sit inside a quoted field", () => {
    const text = "Date,Description,Amount\n2026-01-05,\"NETFLIX, INC.\",-15.49\n2026-01-06,\"line one\r\nline two\nline three\",-1.00\n";
    expect(parseCsvRows(text)).toEqual([
      ["Date", "Description", "Amount"],
      ["2026-01-05", "NETFLIX, INC.", "-15.49"],
      ["2026-01-06", "line one\r\nline two\nline three", "-1.00"]
    ]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvRows("\"say \"\"hi\"\"\",x")).toEqual([["say \"hi\"", "x"]]);
    expect(parseCsvRows("\"\"\"\"")).toEqual([["\""]]);
  });

  it("reads an empty quoted field as an empty string", () => {
    expect(parseCsvRows("\"\",b")).toEqual([["", "b"]]);
  });

  it("does not trim cell whitespace (the caller decides)", () => {
    expect(parseCsvRows("  a , b  ")).toEqual([["  a ", " b  "]]);
  });

  it("treats a quote in the MIDDLE of an unquoted field as a literal, so it cannot swallow the rest of the file", () => {
    // A sloppy exporter writes a descriptor with an inch mark and no quoting.
    // Before the fix the stray quote opened a quoted section, and every later
    // row (all its delimiters and line breaks) was absorbed into that one cell:
    // the second transaction silently disappeared.
    const text = "Date,Description,Amount\n2026-01-05,BEST BUY 55\" TV,-499.99\n2026-01-06,NETFLIX,-15.49\n";
    expect(parseCsvRows(text)).toEqual([
      ["Date", "Description", "Amount"],
      ["2026-01-05", "BEST BUY 55\" TV", "-499.99"],
      ["2026-01-06", "NETFLIX", "-15.49"]
    ]);
  });

  it("keeps text that follows a closing quote in the same field", () => {
    expect(parseCsvRows("\"abc\"def,g")).toEqual([["abcdef", "g"]]);
    // A second quote after the field has started is a literal, not a new section.
    expect(parseCsvRows("\"abc\" \"x\",g")).toEqual([["abc \"x\"", "g"]]);
  });

  it("strips a leading UTF-8 byte-order mark (Excel's \"CSV UTF-8\" export writes one)", () => {
    expect(parseCsvRows(`${BOM}Transaction Date,Amount\n2026-01-05,-1.00`)).toEqual([
      ["Transaction Date", "Amount"],
      ["2026-01-05", "-1.00"]
    ]);
    // Before a quoted first header too.
    expect(parseCsvRows(`${BOM}"Date",Amount`)).toEqual([["Date", "Amount"]]);
  });

  it("keeps a U+FEFF that is not the first character (it is data, not a BOM)", () => {
    expect(parseCsvRows(`a,${BOM}b`)).toEqual([["a", `${BOM}b`]]);
  });

  it("returns formula-looking cells verbatim: the parser never evaluates or strips them (escaping is the exporter's job)", () => {
    // Stripping a leading "-" or "+" on import would re-sign real amounts;
    // formula escaping happens on EXPORT (csvSafeCell), not here.
    const text = "\"=HYPERLINK(\"\"http://example.invalid\"\")\",+1,-10.50,@SUM(A1)\n\"=1+2,3\",x";
    expect(parseCsvRows(text)).toEqual([
      ["=HYPERLINK(\"http://example.invalid\")", "+1", "-10.50", "@SUM(A1)"],
      ["=1+2,3", "x"]
    ]);
  });

  it("parses a huge field intact", () => {
    const huge = "x".repeat(1_000_000);
    const rows = parseCsvRows(`a,"${huge}",b\nc,d`);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.[1]).toHaveLength(1_000_000);
    expect(rows[0]?.[2]).toBe("b");
    expect(rows[1]).toEqual(["c", "d"]);
  });

  it("runs an unterminated quoted field to the end of the input without inventing cells", () => {
    expect(parseCsvRows("a,\"open\nb,c")).toEqual([["a", "open\nb,c"]]);
  });
});

describe("normalizeMerchant", () => {
  it("lowercases and drops corporate / billing noise words", () => {
    expect(normalizeMerchant("NETFLIX.COM INC")).toBe("netflix");
    expect(normalizeMerchant("Spotify USA Recurring Payment")).toBe("spotify usa");
    expect(normalizeMerchant("Acme LLC Subscription Purchase")).toBe("acme");
  });

  it("collapses punctuation and whitespace runs into single spaces", () => {
    expect(normalizeMerchant("  AMZN   Mktp*US--2K4  ")).toBe("amzn mktp us 2k4");
  });

  it("only drops noise words that stand alone, never a fragment of a longer word", () => {
    expect(normalizeMerchant("Coinbase")).toBe("coinbase");
    expect(normalizeMerchant("Incredible Comics")).toBe("incredible comics");
  });

  it("neutralises formula-injection prefixes", () => {
    expect(normalizeMerchant("=HYPERLINK(\"x\")")).toBe("hyperlink x");
    expect(normalizeMerchant("@SUM(A1)")).toBe("sum a1");
  });

  it("returns an empty string when nothing alphanumeric remains", () => {
    expect(normalizeMerchant("  -- * --  ")).toBe("");
    expect(normalizeMerchant("Inc. LLC")).toBe("");
  });
});

describe("parseAmountMinor — separators and rounding", () => {
  it("accepts a leading decimal point", () => {
    expect(parseAmountMinor(".5")).toBe(50);
    expect(parseAmountMinor("0.5")).toBe(50);
  });

  it("rejects separators with no digits", () => {
    expect(parseAmountMinor(".")).toBeNull();
    expect(parseAmountMinor(",")).toBeNull();
    expect(parseAmountMinor("$")).toBeNull();
    // A dangling decimal point is rejected rather than guessed at.
    expect(parseAmountMinor("12.")).toBeNull();
  });

  it("rejects ambiguous or malformed separator sequences instead of guessing", () => {
    expect(parseAmountMinor("1.2.3")).toBeNull();
    expect(parseAmountMinor("1,234,56")).toBeNull();
  });

  it("reads space- and apostrophe-grouped thousands (fr-FR, de-CH)", () => {
    expect(parseAmountMinor("1 234,56")).toBe(123456);
    expect(parseAmountMinor(`1${NBSP}234,56 €`)).toBe(123456);
    expect(parseAmountMinor("1'234.56")).toBe(123456);
  });

  it("rounds a third decimal half-up, carrying into the whole part", () => {
    expect(parseAmountMinor("0.999")).toBe(100);
    expect(parseAmountMinor("10.994")).toBe(1099);
  });

  it("caps at the plausibility limit, inclusive, and rejects a digit string long enough to overflow", () => {
    expect(parseAmountMinor("10000000.00")).toBe(1_000_000_000);
    expect(parseAmountMinor("10000000.01")).toBeNull();
    expect(parseAmountMinor("9".repeat(1000))).toBeNull(); // Number.parseInt -> Infinity
  });
});

describe("parseAmountMinor — sign", () => {
  it("keeps a leading minus and accounting parentheses (existing behaviour)", () => {
    expect(parseAmountMinor("-$15.49")).toBe(-1549);
    expect(parseAmountMinor("($15.49)")).toBe(-1549);
    expect(parseAmountMinor("+15.49")).toBe(1549);
  });

  it("keeps a minus that comes AFTER a currency symbol or code", () => {
    // mobile's CSV import reads a signed amount column as "negative = a charge".
    // Losing this sign turned a real charge into a credit, and it was dropped.
    expect(parseAmountMinor("$-15.49")).toBe(-1549);
    expect(parseAmountMinor("USD -15.49")).toBe(-1549);
    expect(parseAmountMinor("€-9,99")).toBe(-999);
  });

  it("reads a trailing minus and a Unicode minus sign as negative", () => {
    expect(parseAmountMinor("15.49-")).toBe(-1549);
    expect(parseAmountMinor(`${MINUS}15.49`)).toBe(-1549);
  });

  it("reads accounting parentheses with the currency symbol outside them as negative", () => {
    expect(parseAmountMinor("$(15.49)")).toBe(-1549);
    expect(parseAmountMinor("$ (15.49)")).toBe(-1549);
  });

  it("does not treat a parenthesised currency label AFTER the number as a negative marker", () => {
    expect(parseAmountMinor("15.49 (USD)")).toBe(1549);
  });
});

describe("parseAmountMinor — junk that must not become a number", () => {
  it("treats a dot that ends an abbreviation (\"Rs.\") as part of the label, not a decimal point", () => {
    // Before the fix "Rs. 499" became ".499" -> 50 minor units (0.50).
    expect(parseAmountMinor("Rs. 499")).toBe(49900);
    expect(parseAmountMinor("Rs.1,499.50")).toBe(149950);
  });

  it("rejects letters or other symbols BETWEEN digits instead of gluing the digits together", () => {
    // Before the fix "1.5E+2" became "1.52" (1.52) and "10 USD 50" became 1050.
    expect(parseAmountMinor("1.5E+2")).toBeNull();
    expect(parseAmountMinor("10 USD 50")).toBeNull();
    expect(parseAmountMinor("2026-01-05")).toBeNull();
    expect(parseAmountMinor("12abc34")).toBeNull();
  });

  it("still accepts a currency code or word before or after the number", () => {
    expect(parseAmountMinor("USD 15.49")).toBe(1549);
    expect(parseAmountMinor("15.49 USD")).toBe(1549);
    expect(parseAmountMinor("£9.99/mo")).toBe(999);
  });
});

describe("parseAmountMinor: a signed zero", () => {
  // Found by a property test on CI (P6.4): "-0.00" read as minus zero.
  it("is zero, whatever its sign marker", () => {
    for (const text of ["-0.00", "$-0.00", "(0.00)", "0.00-", "−0"]) expect(Object.is(parseAmountMinor(text), 0), text).toBe(true);
  });
});
