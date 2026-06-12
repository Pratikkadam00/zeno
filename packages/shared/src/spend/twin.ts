import { formatMoneyMinor } from "../notifications/renewal-plan";

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

export function createSpendTwin(totalMonthlyMinor: number): SpendTwinComparison[] {
  if (totalMonthlyMinor <= 0) {
    return [];
  }

  return comparisonUnits.map((unit) => ({
    ...unit,
    quantity: Number((totalMonthlyMinor / unit.unitCostMinor).toFixed(totalMonthlyMinor < unit.unitCostMinor ? 1 : 0))
  }));
}

export function summarizeSpendTwin(totalMonthlyMinor: number): string {
  const comparisons = createSpendTwin(totalMonthlyMinor);
  const [first, second] = comparisons;
  if (!first || !second) {
    return "No subscription spend to compare yet.";
  }

  return `${formatMoneyMinor(totalMonthlyMinor)} per month equals about ${first.quantity} ${first.label} or ${second.quantity} ${second.label}.`;
}
