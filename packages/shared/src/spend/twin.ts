import type { CurrencyCode } from "../domain";
import { formatMoneyMinor } from "../notifications/renewal-plan";
import { convertMinor, type ExchangeRates } from "./coach";

export type SpendTwinComparison = {
  label: string;
  quantity: number;
  unitCostMinor: number;
  description: string;
};

const comparisonUnits: Array<Omit<SpendTwinComparison, "quantity">> = [
  {
    label: "Chipotle burritos",
    unitCostMinor: 1000,
    description: "a quick gut-check for everyday discretionary spend"
  },
  {
    label: "gym memberships",
    unitCostMinor: 7000,
    description: "monthly fitness memberships at a mainstream gym"
  },
  {
    label: "weekend flight fund",
    unitCostMinor: 22000,
    description: "rough progress toward a domestic weekend flight"
  },
  {
    label: "grocery weeks",
    unitCostMinor: 9500,
    description: "estimated single-person grocery weeks"
  }
];

// comparisonUnits' unitCostMinor values are USD-denominated (a $10 burrito,
// a $70 gym membership, etc). When homeCurrency isn't USD, convert each unit
// cost via the same rates table before comparing — otherwise raw minor units
// of two different currencies would be compared directly (e.g. ₹1000 paise
// against a $10 burrito).
export function createSpendTwin(totalMonthlyMinor: number, homeCurrency: CurrencyCode = "USD", rates?: ExchangeRates): SpendTwinComparison[] {
  if (totalMonthlyMinor <= 0) {
    return [];
  }

  return comparisonUnits.map((unit) => {
    const unitCostMinor = homeCurrency === "USD"
      ? unit.unitCostMinor
      : convertMinor(unit.unitCostMinor, "USD", homeCurrency, rates ?? {}) ?? unit.unitCostMinor;

    return {
      ...unit,
      unitCostMinor,
      quantity: Number((totalMonthlyMinor / unitCostMinor).toFixed(totalMonthlyMinor < unitCostMinor ? 1 : 0))
    };
  });
}

export function summarizeSpendTwin(totalMonthlyMinor: number, homeCurrency: CurrencyCode = "USD", rates?: ExchangeRates): string {
  const comparisons = createSpendTwin(totalMonthlyMinor, homeCurrency, rates);
  const [first, second] = comparisons;
  if (!first || !second) {
    return "No subscription spend to compare yet.";
  }

  return `${formatMoneyMinor(totalMonthlyMinor, homeCurrency)} per month equals about ${first.quantity} ${first.label} or ${second.quantity} ${second.label}.`;
}
