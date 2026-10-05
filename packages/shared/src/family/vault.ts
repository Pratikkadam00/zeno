import type { Money, Subscription } from "../domain";
import { monthlyAmountIn, type ExchangeRates } from "../spend/coach";

export type FamilyMember = {
  id: string;
  name: string;
  role: "owner" | "adult" | "teen" | "child";
  color: string;
};

export type FamilyVaultSummary = {
  members: Array<FamilyMember & {
    monthlySpend: Money;
    subscriptionCount: number;
  }>;
  sharedSubscriptions: Subscription[];
  totalMonthlySpend: Money;
  // Members' active subscriptions left out of the spend figures because no
  // rate converts their currency (currency honesty: disclosed, never silently
  // dropped or added as raw minor units).
  excludedCurrencyCount: number;
};

export function createFamilyVaultSummary(
  members: FamilyMember[],
  subscriptions: Subscription[],
  currency: Money["currency"] = "USD",
  rates?: ExchangeRates
): FamilyVaultSummary {
  let excludedCurrencyCount = 0;
  const memberRows = members.map((member) => {
    const owned = subscriptions.filter((subscription) => subscription.ownerProfileId === member.id && subscription.status === "active");
    // Without rates only `currency` itself converts (identity). The old
    // no-rates path added every currency's raw minor units and labelled the
    // sum `currency` — $10 + ₹499 came back as ₹509.
    let amountMinor = 0;
    for (const subscription of owned) {
      const amount = monthlyAmountIn(subscription, currency, rates ?? {});
      if (amount === null) {
        excludedCurrencyCount += 1;
      } else {
        amountMinor += amount;
      }
    }
    return {
      ...member,
      monthlySpend: { amountMinor, currency },
      subscriptionCount: owned.length
    };
  });

  const sharedSubscriptions = subscriptions.filter((subscription) => subscription.category === "family" && subscription.status === "active");

  return {
    members: memberRows,
    sharedSubscriptions,
    totalMonthlySpend: {
      amountMinor: memberRows.reduce((sum, member) => sum + member.monthlySpend.amountMinor, 0),
      currency
    },
    excludedCurrencyCount
  };
}

// Stryker disable StringLiteral,ObjectLiteral: sample household shown in the demo; a changed sample
// name or colour changes no behaviour (P6.1).
export const demoFamilyMembers: FamilyMember[] = [
  { id: "profile_local", name: "You", role: "owner", color: "#2563EB" },
  { id: "family_maya", name: "Maya", role: "adult", color: "#0D9488" },
  { id: "family_avi", name: "Avi", role: "teen", color: "#D97706" }
];
// Stryker restore StringLiteral,ObjectLiteral
