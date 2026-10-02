import { describe, expect, it } from "vitest";
import { parseDay } from "./day-text";

const iso = (text: string) => parseDay(text)?.toISOString() ?? null;

describe("parseDay (F21): receipt and CSV dates as strict UTC days", () => {
  it.each([
    ["2026-03-03", "2026-03-03T00:00:00.000Z"],
    ["2026/03/03", "2026-03-03T00:00:00.000Z"],
    ["2026-1-5", "2026-01-05T00:00:00.000Z"],
    ["2026-03-03T10:00:00Z", "2026-03-03T00:00:00.000Z"],
    ["2026-03-03 10:00:00", "2026-03-03T00:00:00.000Z"],
    ["03/03/2026", "2026-03-03T00:00:00.000Z"],
    ["1/5/2026", "2026-01-05T00:00:00.000Z"],
    ["12/31/2025", "2025-12-31T00:00:00.000Z"],
    ["03-03-2026", "2026-03-03T00:00:00.000Z"],
    ["3/3/26", "2026-03-03T00:00:00.000Z"],
    ["13/01/2026", "2026-01-13T00:00:00.000Z"],
    ["31/12/2025", "2025-12-31T00:00:00.000Z"],
    ["Jan 15, 2026", "2026-01-15T00:00:00.000Z"],
    ["January 15 2026", "2026-01-15T00:00:00.000Z"],
    ["Sept 5, 2026", "2026-09-05T00:00:00.000Z"],
    ["Sep. 5, 2026", "2026-09-05T00:00:00.000Z"],
    ["Mar 3, 2026 10:00 AM", "2026-03-03T00:00:00.000Z"],
    ["15 Jan 2026", "2026-01-15T00:00:00.000Z"],
    ["15 January 2026", "2026-01-15T00:00:00.000Z"],
    ["  2026-03-03  ", "2026-03-03T00:00:00.000Z"],
    ["Feb 29, 2028", "2028-02-29T00:00:00.000Z"]
  ])("%s is %s, whatever the device's time zone", (text, expected) => {
    expect(iso(text)).toBe(expected);
  });

  it.each([
    ["30 February, which Date.parse made 2 March", "02/30/2026"],
    ["30 February in ISO form", "2026-02-30"],
    ["31 February by name", "February 31, 2026"],
    ["29 February in a non-leap year", "Feb 29, 2026"],
    ["31 April", "2026-04-31"],
    ["a day of 45", "13/45/2026"],
    ["month 13 with a day over 12 too", "13/13/2026"],
    ["month 0", "00/10/2026"],
    ["a made-up month name", "Foo 5, 2026"],
    ["a made-up month name, day first", "5 Foo 2026"],
    ["a two-letter month", "Ja 5, 2026"],
    ["a year alone", "2026"],
    ["prose", "not-a-date"],
    ["the empty string", ""],
    ["a reference number", "13-45-20261"]
  ])("rejects %s", (_name, text) => {
    expect(parseDay(text)).toBeNull();
  });
});
