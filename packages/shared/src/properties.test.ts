import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseAmountMinor, parseCsvRows } from "./csv/parse-utils";
import { extractStoreAppName } from "./discovery/email-receipts";
import type { BillingCycle, CurrencyCode, Subscription, SubscriptionCategory } from "./domain";
import { convertMinor, createSpendSummary, monthlyAmount, type ExchangeRates } from "./spend/coach";

// P6.4: properties, not examples. Each holds for every input fast-check makes up
// (a hundred runs each, shrunk to the smallest failing case if one breaks), so a
// rule that only held for the hand-picked cases in the example tests shows here.

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];
const CYCLES: BillingCycle[] = ["weekly", "monthly", "quarterly", "annual", "trial", "unknown"];
const currency = fc.constantFrom(...CURRENCIES);
const rate = fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true });
const rates = fc.record({ USD: fc.constant(1), EUR: rate, GBP: rate, INR: rate, CAD: rate, AUD: rate }) as fc.Arbitrary<ExchangeRates>;
const minor = fc.integer({ min: 0, max: 100_000_000 });

describe("money: convertMinor", () => {
  it("is a whole number of minor units, never negative, for any amount and positive rates", () => {
    fc.assert(fc.property(minor, currency, currency, rates, (amount, from, to, table) => {
      const out = convertMinor(amount, from, to, table)!;
      expect(Number.isInteger(out)).toBe(true);
      expect(out).toBeGreaterThanOrEqual(0);
    }));
  });

  it("is the amount itself within one currency, whatever the table says", () => {
    fc.assert(fc.property(minor, currency, (amount, code) => {
      expect(convertMinor(amount, code, code, {})).toBe(amount);
    }));
  });

  it("never invents a number: a missing rate on either side gives null", () => {
    fc.assert(fc.property(minor, currency, currency, rates, (amount, from, to, table) => {
      fc.pre(from !== to);
      const without = { ...table, [to]: undefined };
      expect(convertMinor(amount, from, to, without)).toBeNull();
    }));
  });

  it("keeps order: a bigger amount never converts to a smaller one", () => {
    fc.assert(fc.property(minor, minor, currency, currency, rates, (a, b, from, to, table) => {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      expect(convertMinor(lo, from, to, table)!).toBeLessThanOrEqual(convertMinor(hi, from, to, table)!);
    }));
  });
});

const sub = (price: number, cycle: BillingCycle, cur: CurrencyCode = "USD", category: SubscriptionCategory = "other", id = "s"): Subscription => ({
  id, name: id, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, category,
  price: { amountMinor: price, currency: cur }, billingCycle: cycle, status: "active", ownerProfileId: "p", source: "manual"
});

describe("money: monthlyAmount", () => {
  it("is a whole non-negative number, in the right range for each cycle", () => {
    fc.assert(fc.property(minor, fc.constantFrom(...CYCLES), (price, cycle) => {
      const m = monthlyAmount(sub(price, cycle));
      expect(Number.isInteger(m)).toBe(true);
      expect(m).toBeGreaterThanOrEqual(0);
      if (cycle === "monthly") expect(m).toBe(price);
      if (cycle === "annual" || cycle === "quarterly") expect(m).toBeLessThanOrEqual(price);
      if (cycle === "weekly") expect(m).toBeGreaterThanOrEqual(price * 4);
      if (cycle === "trial" || cycle === "unknown") expect(m).toBe(0);
    }));
  });
});

describe("money: createSpendSummary", () => {
  const subs = fc.array(
    fc.record({
      price: fc.integer({ min: 0, max: 1_000_000 }),
      cycle: fc.constantFrom(...CYCLES),
      cur: currency,
      category: fc.constantFrom<SubscriptionCategory>("ai_tools", "entertainment", "productivity", "health", "other")
    }),
    { maxLength: 12 }
  );

  // Rates may be missing here (only USD is certain), so some subscriptions are
  // excluded: the rule "counted + excluded = all" has to see both sides.
  const someRates = fc.record({ USD: fc.constant(1), EUR: rate, GBP: rate, INR: rate, CAD: rate, AUD: rate }, { requiredKeys: ["USD"] }) as fc.Arbitrary<ExchangeRates>;

  it("the total is the sum of the categories, which come largest first", () => {
    fc.assert(fc.property(subs, someRates, (list, table) => {
      const summary = createSpendSummary(list.map((s, i) => sub(s.price, s.cycle, s.cur, s.category, `s${i}`)), new Date(), { homeCurrency: "USD", rates: table });
      expect(summary.byCategory.reduce((sum, c) => sum + c.monthlyMinor, 0)).toBe(summary.totalMonthlyMinor);
      for (let i = 1; i < summary.byCategory.length; i++) expect(summary.byCategory[i - 1]!.monthlyMinor).toBeGreaterThanOrEqual(summary.byCategory[i]!.monthlyMinor);
      // Every active subscription is either counted or excluded, never lost.
      const counted = summary.byCategory.reduce((sum, c) => sum + c.count, 0);
      expect(counted + (summary.excludedCurrencyCount ?? 0)).toBe(list.length);
    }));
  });
});

describe("parsing: parseAmountMinor", () => {
  it("reads back any amount written the way statements write it", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 99_999_999 }), fc.constantFrom("", "$", "USD ", "€"), fc.boolean(), fc.boolean(), (cents, prefix, negative, grouped) => {
      const whole = Math.floor(cents / 100).toString();
      const units = grouped ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
      const text = `${negative ? "-" : ""}${prefix}${units}.${String(cents % 100).padStart(2, "0")}`;
      expect(parseAmountMinor(text)).toBe(negative && cents !== 0 ? -cents : cents);
    }));
  });

  it("never throws, and gives null or a whole number, for any text at all", () => {
    fc.assert(fc.property(fc.string({ maxLength: 60 }), (text) => {
      const out = parseAmountMinor(text);
      expect(out === null || Number.isInteger(out)).toBe(true);
    }), { numRuns: 500 });
  });
});

describe("parsing: parseCsvRows", () => {
  it("gives back exactly the rows of any simple table (no quotes, commas or line breaks in a cell)", () => {
    const cell = fc.string({ maxLength: 8 }).filter((c) => !/[",\r\n]/.test(c));
    const table = fc.array(fc.array(cell, { minLength: 2, maxLength: 5 }), { minLength: 1, maxLength: 6 }).filter((rows) => rows.every((r) => r.some((c) => c.length > 0)));
    fc.assert(fc.property(table, (rows) => {
      expect(parseCsvRows(rows.map((r) => r.join(",")).join("\n"))).toEqual(rows);
    }));
  });

  it("never throws on any text", () => {
    fc.assert(fc.property(fc.string({ maxLength: 200 }), (text) => {
      expect(Array.isArray(parseCsvRows(text))).toBe(true);
    }), { numRuns: 500 });
  });
});

describe("parsing: extractStoreAppName", () => {
  it("never throws, and gives null or a name of at least two characters taken from the text", () => {
    fc.assert(fc.property(fc.string({ maxLength: 120 }), (text) => {
      const name = extractStoreAppName(text);
      if (name !== null) {
        expect(name.length).toBeGreaterThanOrEqual(2);
        for (const word of name.split(" ")) expect(text).toContain(word);
      }
    }), { numRuns: 500 });
  });
});
