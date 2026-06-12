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
  const cleaned = trimmed.replace(/[$,\s()]/g, "").replace(/^-/, "");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) {
    return null;
  }
  const amountMinor = Math.round(value * 100);
  return negative ? -amountMinor : amountMinor;
}
