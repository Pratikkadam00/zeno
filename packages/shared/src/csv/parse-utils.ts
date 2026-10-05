export function normalizeMerchant(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|com|payment|purchase|recurring|subscription)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;
  // A quote opens a quoted section only at the START of a field (RFC 4180),
  // where "start" also allows spaces or tabs before it: many exporters write
  // `a, "Netflix, Inc.", 15.49`, and treating that quote as a literal split the
  // name at its comma and shifted every later column. Anywhere else a quote is
  // a literal: a sloppy exporter's unquoted `BEST BUY 55" TV` used to open a
  // section that swallowed every later delimiter and line break, silently
  // dropping the rest of the file.
  let atFieldStart = true;
  // Excel's "CSV UTF-8" export starts with a byte-order mark. It is encoding
  // metadata, not part of the first header.
  const start = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (let i = start; i < text.length; i += 1) {
    const char = text.charAt(i);
    const next = text.charAt(i + 1);

    if (quoted) {
      if (char === "\"" && next === "\"") {
        current += "\"";
        i += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === "\"" && atFieldStart) {
      quoted = true;
      atFieldStart = false;
      current = ""; // only spaces/tabs can precede it; they are padding, not data
    } else if (char === ",") {
      row.push(current);
      current = "";
      atFieldStart = true;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      atFieldStart = true;
    } else {
      current += char;
      if (char !== " " && char !== "\t") {
        atFieldStart = false;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

export function parseAmountMinor(input: string | undefined): number | null {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Split into the text before the first digit, the digits, and the text after
  // the last digit, so a currency symbol/code on either side cannot hide a sign
  // or be mistaken for part of the number.
  const firstDigit = trimmed.search(/\d/);
  if (firstDigit === -1) {
    return null;
  }
  let lastDigit = firstDigit;
  for (let i = trimmed.length - 1; i > firstDigit; i -= 1) {
    const code = trimmed.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      lastDigit = i;
      break;
    }
  }
  const prefix = trimmed.slice(0, firstDigit);
  const digits = trimmed.slice(firstDigit, lastDigit + 1);
  const suffix = trimmed.slice(lastDigit + 1);

  // Between the first and last digit only separators and digit-group spacing
  // (space, NBSP, narrow NBSP, ' or ’) may appear. Anything else means this is
  // not one amount ("1.5E+2", "10 USD 50", a date), and stripping it would glue
  // the digits into a different number. A plain character class, so the check
  // stays linear on a huge hostile field.
  if (/[^\d.,\s'’]/.test(digits)) {
    return null;
  }

  // Sign markers may sit outside a currency symbol or code: a minus (ASCII or
  // U+2212 "−") anywhere before the first digit ("-$10", "$-10", "USD -10"), a
  // trailing minus ("10.00-"), or accounting parentheses around the number
  // with the symbol inside or outside them ("(10.00)", "($10.00)", "$(10.00)").
  // The mobile CSV import reads a signed column as "negative = a charge", so a
  // lost sign turned a real charge into a credit that was then dropped.
  const negative = /[-−]/.test(prefix) || /[-−]$/.test(suffix) || (prefix.includes("(") && suffix.includes(")"));

  // A dot that ends a word before the number is an abbreviation ("Rs. 499"),
  // not a decimal point: it used to turn "Rs. 499" into ".499", i.e. 0.50.
  // Then keep only digits and the two possible separators.
  let s = (prefix.replace(/([A-Za-z])\./g, "$1") + digits + suffix).replace(/[^0-9.,]/g, "");

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // The right-most separator is the decimal point; the other groups thousands.
    // e.g. "1.234,56" -> "1234.56"  and  "1,234.56" -> "1234.56".
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only commas: treat as a decimal comma when it looks like one (1–2 trailing
    // digits, e.g. "10,50"), otherwise as a thousands separator ("1,000").
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  // (only-dot case is left as-is — a standard decimal point.)

  // Build minor units directly from the string so binary float rounding can't
  // bite (1.005 * 100 === 100.4999… would otherwise floor to 100, not 101).
  // `s` always holds at least one digit (from `digits`), so a successful match
  // always has a non-empty whole or fractional part.
  const match = /^(\d*)(?:\.(\d+))?$/.exec(s);
  if (!match) {
    return null;
  }
  const [, whole = "", frac = ""] = match;
  let amountMinor = Number.parseInt(whole || "0", 10) * 100 + Number.parseInt((frac + "00").slice(0, 2), 10);
  if (frac.length >= 3 && frac.charCodeAt(2) - 48 >= 5) {
    amountMinor += 1; // round the third decimal
  }
  // An implausibly long digit string (e.g. a malformed or adversarial CSV
  // field) doesn't overflow to Infinity until 400+ digits — Number.parseInt
  // silently rounds anything shorter to a large-but-finite double instead of
  // failing, which would otherwise flow unguarded into spend totals/insights.
  // $10,000,000 is far beyond any real single subscription/transaction amount
  // (comfortably above the largest legitimate value exercised in this file's
  // own thousands-separator parsing tests).
  const MAX_PLAUSIBLE_AMOUNT_MINOR = 10_000_000_00;
  if (!Number.isFinite(amountMinor) || amountMinor > MAX_PLAUSIBLE_AMOUNT_MINOR) {
    return null;
  }
  // "-0.00" is zero, not minus zero (found by a property test on CI, P6.4).
  return negative && amountMinor !== 0 ? -amountMinor : amountMinor;
}
