import type { Money, Subscription } from "../domain";
import { monthlyAmount } from "../spend/coach";

export type BusinessSeatRole = "owner" | "admin" | "finance" | "viewer";

export type BusinessSeat = {
  id: string;
  emailHash: string;
  role: BusinessSeatRole;
};

export type BusinessWorkspace = {
  id: string;
  name: string;
  plan: "business";
  seats: BusinessSeat[];
  monthlySeatLimit: number;
};

export type BusinessSubscriptionSummary = {
  workspaceId: string;
  workspaceName: string;
  seatCount: number;
  monthlySpend: Money;
  subscriptionCount: number;
  renewalCountNext30Days: number;
};

export function createBusinessSummary(
  workspace: BusinessWorkspace,
  subscriptions: Subscription[],
  now = new Date(),
  currency: Money["currency"] = "USD"
): BusinessSubscriptionSummary {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    seatCount: workspace.seats.length,
    monthlySpend: {
      amountMinor: active.reduce((sum, subscription) => sum + monthlyAmount(subscription), 0),
      currency
    },
    subscriptionCount: active.length,
    renewalCountNext30Days: active.filter((subscription) => {
      if (!subscription.nextRenewalDate) {
        return false;
      }
      const due = Date.parse(subscription.nextRenewalDate);
      return due >= now.getTime() && due <= now.getTime() + 30 * 86_400_000;
    }).length
  };
}

export const demoBusinessWorkspace: BusinessWorkspace = {
  id: "biz_zeno_demo",
  name: "Zeno Labs",
  plan: "business",
  monthlySeatLimit: 25,
  seats: [
    { id: "seat_owner", emailHash: "hash_owner", role: "owner" },
    { id: "seat_finance", emailHash: "hash_finance", role: "finance" },
    { id: "seat_viewer", emailHash: "hash_viewer", role: "viewer" }
  ]
};
