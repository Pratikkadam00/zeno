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

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      i += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char ?? "";
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

  const negative = trimmed.startsWith("-") || /^\(.+\)$/.test(trimmed);

  // Keep only digits and the two possible separators.
  let s = trimmed.replace(/[^0-9.,]/g, "");
  if (!s) {
    return null;
  }

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
  const match = /^(\d*)(?:\.(\d+))?$/.exec(s);
  if (!match || (match[1] === "" && (match[2] ?? "") === "")) {
    return null;
  }
  const whole = match[1] ?? "";
  const frac = match[2] ?? "";
  let amountMinor = Number.parseInt(whole || "0", 10) * 100 + Number.parseInt((frac + "00").slice(0, 2) || "0", 10);
  if (frac.length >= 3 && frac.charCodeAt(2) - 48 >= 5) {
    amountMinor += 1; // round the third decimal
  }
  if (!Number.isFinite(amountMinor)) {
    return null;
  }
  return negative ? -amountMinor : amountMinor;
}
