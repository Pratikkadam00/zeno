import { searchServices } from "@subradar/service-catalog";
import { parseAmountMinor, parseCsvRows } from "@subradar/shared";
import { calculateNextRenewal, confidenceRank, isWithin, slugify, titleCase } from "./discovery-helpers";
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
  amount?: number;
  debit?: number;
  credit?: number;
};

export function parseCSV(csvContent: string): CSVParseResult {
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

  return {
    subscriptions: detectRecurringSubscriptions(transactions),
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
  const credit = firstColumn(lowered, ["credit", "deposit"]);

  return {
    date: date === -1 ? 0 : date,
    description: description === -1 ? 1 : description,
    amount: amount === -1 ? undefined : amount,
    debit: debit === -1 ? undefined : debit,
    credit: credit === -1 ? undefined : credit
  };
}

function parseTransaction(row: string[], columns: ColumnMap): Transaction | null {
  const date = parseDate(row[columns.date]);
  if (!date) {
    return null;
  }

  const amount = parseChargeAmount(row, columns);
  if (amount === null || amount <= 0) {
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

  if (columns.amount !== undefined) {
    const amount = parseMoney(row[columns.amount]);
    if (amount !== null && amount < 0) {
      return Math.abs(amount);
    }
  }

  if (columns.credit !== undefined) {
    const credit = parseMoney(row[columns.credit]);
    if (credit !== null && credit > 0) {
      return null;
    }
  }

  return null;
}

function detectRecurringSubscriptions(transactions: Transaction[]): ParsedSubscription[] {
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
      currency: "USD",
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
  // Treat quarterly (~90-day) cadence as monthly for tracking, since the
  // ParsedSubscription contract only models weekly/monthly/annual.
  if (gaps.some((gap) => gap >= 85 && gap <= 95)) {
    return "monthly";
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

function cleanDescription(description: string): string {
  const cleaned = description
    .replace(/^(SQ \*|TST\*|PAYPAL \*|SP |APL\*)/i, "")
    .replace(/\.(com|net|org|io|ai|co)\b/gi, "")
    .replace(/\b(ending in|card|visa|mc|amex)\s*\d{4}\b/gi, "")
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+-\s+[A-Z]{2}$/i, "")
    .replace(/\s+[A-Z]{2,}(?:\s+US)?$/i, "")
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
