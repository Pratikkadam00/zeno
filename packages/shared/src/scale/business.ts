import type { Money, Subscription } from "../domain";
import { monthlyAmountIn, type ExchangeRates } from "../spend/coach";

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
  // Active subscriptions left out of monthlySpend because no rate converts
  // their currency into monthlySpend.currency (currency honesty: disclosed,
  // never silently dropped or added as raw minor units).
  excludedCurrencyCount: number;
  subscriptionCount: number;
  renewalCountNext30Days: number;
};

export function createBusinessSummary(
  workspace: BusinessWorkspace,
  subscriptions: Subscription[],
  now = new Date(),
  currency: Money["currency"] = "USD",
  rates?: ExchangeRates
): BusinessSubscriptionSummary {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  // Without rates only `currency` itself converts (identity). The old no-rates
  // path added every currency's raw minor units and labelled the sum
  // `currency` — $10 + ₹499 came back as ₹509.
  let amountMinor = 0;
  let excludedCurrencyCount = 0;
  for (const subscription of active) {
    const amount = monthlyAmountIn(subscription, currency, rates ?? {});
    if (amount === null) {
      excludedCurrencyCount += 1;
    } else {
      amountMinor += amount;
    }
  }
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    seatCount: workspace.seats.length,
    monthlySpend: { amountMinor, currency },
    excludedCurrencyCount,
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
