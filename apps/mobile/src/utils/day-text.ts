import { isIsoDay } from "./iso-day";

/**
 * A charge date as receipts and bank CSVs write it, read STRICTLY as a UTC
 * calendar day (F21).
 *
 * `Date.parse` did two wrong things here (measured in Node 24):
 * - it is lenient: "02/30/2026" and "February 31, 2026" became 2 March, and
 *   "2026-02-30" became 2 March, so an impossible date was kept as a
 *   different day;
 * - it reads every non-ISO form as LOCAL time: "Feb 28, 2026" on a UTC+5:30
 *   device became 2026-02-27T18:30Z, the previous day once stored as UTC.
 *
 * Accepted (a trailing time of day is ignored; charge dates are day-level
 * everywhere in Zeno):
 * - 2026-03-03, 2026/03/03, with an optional "T10:00:00Z" or " 10:00:00";
 * - 03/03/2026, 3/3/2026, 03-03-2026, 3/3/26: month first, as the supported
 *   banks (Chase, Citi, Wells Fargo, Bank of America) export. A first number
 *   above 12 with a second of 12 or less is read day first ("13/01/2026"),
 *   since nothing else fits. A two-digit year is 20YY, as `Date.parse` did.
 * - Jan 15, 2026 · January 15 2026 · Sept 5, 2026 · 15 Jan 2026 · 15 January
 *   2026: a month name or any prefix of three letters or more.
 *
 * Returns midnight UTC of that day, or null when the text names no real day.
 */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// `name` has three letters or more: the patterns below require it.
function monthNumber(name: string): number | null {
  const lower = name.toLowerCase();
  const index = MONTHS.findIndex((month) => month.startsWith(lower));
  return index === -1 ? null : index + 1;
}

function realDay(year: number, month: number, day: number): Date | null {
  const text = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isIsoDay(text) ? new Date(`${text}T00:00:00.000Z`) : null;
}

export function parseDay(text: string): Date | null {
  const value = text.trim();

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ].*)?$/.exec(value);
  if (iso) return realDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})(?:[T ].*)?$/.exec(value);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = numeric[3]!.length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
    const dayFirst = first > 12 && second <= 12;
    return dayFirst ? realDay(year, second, first) : realDay(year, first, second);
  }

  const monthFirst = /^([A-Za-z]{3,})\.? (\d{1,2}),? (\d{4})(?: .*)?$/.exec(value);
  if (monthFirst) {
    const month = monthNumber(monthFirst[1]!);
    return month === null ? null : realDay(Number(monthFirst[3]), month, Number(monthFirst[2]));
  }

  const dayFirst = /^(\d{1,2}) ([A-Za-z]{3,})\.?,? (\d{4})(?: .*)?$/.exec(value);
  if (dayFirst) {
    const month = monthNumber(dayFirst[2]!);
    return month === null ? null : realDay(Number(dayFirst[3]), month, Number(dayFirst[1]));
  }

  return null;
}
