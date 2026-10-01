import { searchServices } from "@zeno/service-catalog";
import { parseAmountMinor, parseCsvRows } from "@zeno/shared";
import type { CurrencyCode } from "@zeno/shared";
import { calculateNextRenewal, confidenceRank, currencyEvidence, isWithin, slugify, titleCase } from "./discovery-helpers";
import type { ParsedSubscription } from "./emailScanner";

export interface CSVParseResult {
  subscriptions: ParsedSubscription[];
  totalRows: number;
  detectedFormat: string;
}

type BankFormat = "Chase" | "Bank of America" | "Wells Fargo" | "Citi" | "Capital One" | "Generic";

type Transaction = {
  date: Date;
  description: string;
  amount: number;
};

type ColumnMap = {
  date: number;
  description: number;
  amount?: number | undefined;
  debit?: number | undefined;
};

// Finding F18: every detection was labelled USD. That is right for the five US
// bank formats recognised below (the format itself says USD), and unfounded for
// a "Generic" file. A Generic file now takes the currency its own amount cells
// show (€, £, ₹, Rs., CA$, A$ or an ISO code); with bare numbers only, it takes
// `fallbackCurrency`, which the app passes as the user's home currency.
// Required, so no caller can silently fall back to USD again.
export function parseCSV(csvContent: string, fallbackCurrency: CurrencyCode): CSVParseResult {
  const rows = parseCsvRows(csvContent).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length === 0) {
    return { subscriptions: [], totalRows: 0, detectedFormat: "Unknown" };
  }

  const header = rows[0].map((cell) => cell.trim());
  const detectedFormat = detectFormat(header);
  const columnMap = getColumnMap(header, detectedFormat);
  const transactions = rows
    .slice(1)
    .map((row) => parseTransaction(row, columnMap))
    .filter((transaction): transaction is Transaction => Boolean(transaction));
  const currency = fileCurrency(detectedFormat, rows.slice(1), columnMap, fallbackCurrency);

  return {
    subscriptions: detectRecurringSubscriptions(transactions, currency),
    totalRows: Math.max(0, rows.length - 1),
    detectedFormat
  };
}

function detectFormat(header: string[]): BankFormat {
  const headerText = header.join(" ").toLowerCase();
  if (headerText.includes("card no.")) {
    return "Capital One";
  }
  if (headerText.includes("running bal")) {
    return "Bank of America";
  }
  if (headerText.includes("transaction date") || headerText.includes("posting date")) {
    return "Chase";
  }
  if (header.length === 5 && header.filter((cell) => cell.trim() === "*").length >= 2) {
    return "Wells Fargo";
  }
  if (header.length === 3 && hasColumn(header, "date") && hasColumn(header, "description") && hasColumn(header, "amount")) {
    return "Citi";
  }
  return "Generic";
}

function getColumnMap(header: string[], format: BankFormat): ColumnMap {
  if (format === "Wells Fargo") {
    return { date: 0, amount: 1, description: 4 };
  }

  const lowered = header.map((cell) => cell.toLowerCase());
  const date = firstColumn(lowered, ["transaction date", "posting date", "posted date", "date"]);
  const description = firstColumn(lowered, ["description", "merchant", "name"]);
  const amount = firstColumn(lowered, ["amount"]);
  const debit = firstColumn(lowered, ["debit", "withdrawal"]);

  // No credit/deposit column: a credit is never a charge, and the old credit
  // check returned null on both of its paths (it could not change any result).
  return {
    date: date === -1 ? 0 : date,
    description: description === -1 ? 1 : description,
    amount: amount === -1 ? undefined : amount,
    debit: debit === -1 ? undefined : debit
  };
}

function parseTransaction(row: string[], columns: ColumnMap): Transaction | null {
  const date = parseDate(row[columns.date]);
  if (!date) {
    return null;
  }

  // parseChargeAmount only ever returns a positive charge or null.
  const amount = parseChargeAmount(row, columns);
  if (amount === null) {
    return null;
  }

  const description = cleanDescription(row[columns.description] ?? "");
  if (!description) {
    return null;
  }

  return { date, description, amount };
}

function parseChargeAmount(row: string[], columns: ColumnMap): number | null {
  if (columns.debit !== undefined) {
    const debit = parseMoney(row[columns.debit]);
    if (debit !== null && debit > 0) {
      return debit;
    }
  }

  // A signed amount column: negative = money out (a charge); positive = a credit.
  if (columns.amount !== undefined) {
    const amount = parseMoney(row[columns.amount]);
    if (amount !== null && amount < 0) {
      return Math.abs(amount);
    }
  }

  return null;
}

function fileCurrency(format: BankFormat, dataRows: string[][], columns: ColumnMap, fallback: CurrencyCode): CurrencyCode {
  if (format !== "Generic") return "USD";
  const moneyCells = dataRows.flatMap((row) => [columns.amount, columns.debit].map((index) => (index === undefined ? "" : row[index] ?? "")));
  return currencyEvidence(moneyCells.join(" ")) ?? fallback;
}

function detectRecurringSubscriptions(transactions: Transaction[], currency: CurrencyCode): ParsedSubscription[] {
  const grouped = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const key = slugify(transaction.description);
    grouped.set(key, [...(grouped.get(key) ?? []), transaction]);
  }

  const parsed: ParsedSubscription[] = [];
  for (const merchantTransactions of grouped.values()) {
    if (merchantTransactions.length < 2) {
      continue;
    }

    const sorted = [...merchantTransactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    const averageAmount = sorted.reduce((sum, transaction) => sum + transaction.amount, 0) / sorted.length;
    const similarAmounts = sorted.filter((transaction) => isWithin(transaction.amount, averageAmount, 0.1, 1));
    if (similarAmounts.length < 2) {
      continue;
    }

    const billingCycle = detectCycle(similarAmounts);
    if (billingCycle === "unknown") {
      continue;
    }

    const lastCharge = similarAmounts[similarAmounts.length - 1];
    const service = searchServices(lastCharge.description, 1)[0];
    const nextRenewal = calculateNextRenewal(lastCharge.date, billingCycle);
    const confidence: ParsedSubscription["confidence"] = service ? "high" : "medium";

    parsed.push({
      name: service?.name ?? lastCharge.description,
      amount: Number(averageAmount.toFixed(2)),
      currency,
      billingCycle,
      lastCharged: lastCharge.date.toISOString(),
      nextRenewal: nextRenewal.toISOString(),
      confidence,
      serviceId: service?.id,
      rawMerchant: lastCharge.description,
      cancelUrl: service?.cancelUrl
    });
  }

  return dedupe(parsed);
}

function detectCycle(transactions: Transaction[]): ParsedSubscription["billingCycle"] {
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const gaps = sorted.slice(1).map((transaction, index) => daysBetween(sorted[index].date, transaction.date));
  if (gaps.some((gap) => gap >= 5 && gap <= 9)) {
    return "weekly";
  }
  if (gaps.some((gap) => gap >= 25 && gap <= 35)) {
    return "monthly";
  }
  // Quarterly (~90-day) cadence — kept as quarterly so monthlyAmount divides by 3.
  // (Mapping it to monthly was a 3× overcount of the recurring spend.)
  if (gaps.some((gap) => gap >= 85 && gap <= 95)) {
    return "quarterly";
  }
  if (gaps.some((gap) => gap >= 360 && gap <= 375)) {
    return "annual";
  }
  return "unknown";
}

function dedupe(subscriptions: ParsedSubscription[]): ParsedSubscription[] {
  const grouped = new Map<string, ParsedSubscription>();
  for (const subscription of subscriptions) {
    const key = slugify(subscription.serviceId ?? subscription.name);
    const current = grouped.get(key);
    if (!current || confidenceRank(subscription.confidence) > confidenceRank(current.confidence) || subscription.amount > current.amount) {
      grouped.set(key, subscription);
    }
  }
  return [...grouped.values()].sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || b.amount - a.amount);
}

// Trailing location noise on US card descriptors: a state/territory code
// (optionally after " - "), optionally followed by US/USA, or a bare US/USA —
// "… LOS GATOS CA", "… - NY", "SPOTIFY USA". Uppercase only, as banks export.
//
// Finding F20: the previous rule, /\s+[A-Z]{2,}(?:\s+US)?$/i, stripped ANY last
// word of 2+ letters: "APPLE MUSIC" → "Apple", "DISNEY PLUS" → "Disney",
// "ZZQX CLUB" → "Zzqx". Distinct subscriptions then merged into one group with
// an averaged amount, and groups whose amounts then differed were dropped.
const US_REGION_CODES =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|PR|VI|GU|AS|MP";
const trailingLocation = new RegExp(`\\s+(?:-\\s+)?(?:${US_REGION_CODES})(?:\\s+USA?)?$|\\s+USA?$`);

function cleanDescription(description: string): string {
  const cleaned = description
    .replace(/^(SQ \*|TST\*|PAYPAL \*|SP |APL\*)/i, "")
    .replace(/\.(com|net|org|io|ai|co)\b/gi, "")
    .replace(/\b(ending in|card|visa|mc|amex)\s*\d{4}\b/gi, "")
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(trailingLocation, "")
    .trim();

  return titleCase(cleaned);
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value.trim());
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function parseMoney(value: string | undefined): number | null {
  const amountMinor = parseAmountMinor(value);
  return amountMinor === null ? null : amountMinor / 100;
}

function hasColumn(header: string[], name: string): boolean {
  return header.some((cell) => cell.toLowerCase().includes(name));
}

function firstColumn(header: string[], names: string[]): number {
  return header.findIndex((cell) => names.some((name) => cell.includes(name)));
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
