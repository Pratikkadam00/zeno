import type { Money, Subscription } from "../domain";
import { monthlyAmount } from "../spend/coach";

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
};

export function createFamilyVaultSummary(
  members: FamilyMember[],
  subscriptions: Subscription[],
  currency: Money["currency"] = "USD"
): FamilyVaultSummary {
  const memberRows = members.map((member) => {
    const owned = subscriptions.filter((subscription) => subscription.ownerProfileId === member.id && subscription.status === "active");
    return {
      ...member,
      monthlySpend: {
        amountMinor: owned.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0),
        currency
      },
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
    }
  };
}

export const demoFamilyMembers: FamilyMember[] = [
  { id: "profile_local", name: "You", role: "owner", color: "#2563EB" },
  { id: "family_maya", name: "Maya", role: "adult", color: "#0D9488" },
  { id: "family_avi", name: "Avi", role: "teen", color: "#D97706" }
];
