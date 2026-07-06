import type { CurrencyCode, Subscription, SubscriptionCategory } from "../domain";
import { formatMoneyMinor } from "../notifications/renewal-plan";

export type SpendInsightKind =
  | "category_over_budget"
  | "duplicate_category"
  | "annual_savings"
  | "unused_review"
  | "spend_twin";

export type SpendInsight = {
  kind: SpendInsightKind;
  severity: "info" | "warning" | "opportunity";
  title: string;
  body: string;
  subscriptionIds: string[];
  estimatedMonthlyImpactMinor?: number;
};

export type SpendSummary = {
  totalMonthlyMinor: number;
  byCategory: Array<{
    category: SubscriptionCategory;
    monthlyMinor: number;
    count: number;
  }>;
  insights: SpendInsight[];
  // Only meaningful when `fx` was passed to createSpendSummary — count of
  // active subscriptions excluded from totalMonthlyMinor/byCategory because no
  // usable exchange rate existed for their currency. Mirrors the existing
  // excluded-with-notice pattern in
  // apps/mobile/src/discovery/discovery-helpers.ts's summarizeFoundMoney —
  // never silently folded into the total.
  excludedCurrencyCount?: number;
};

// A fixed-base rate table (units of each currency per 1 USD — e.g. from
// open.er-api.com/v6/latest/USD). The same table converts between any pair of
// the app's supported currencies regardless of which one is "home."
export type ExchangeRates = Partial<Record<CurrencyCode, number>>;

export type FxContext = {
  homeCurrency: CurrencyCode;
  rates: ExchangeRates;
};

const profileBenchmarks: Partial<Record<SubscriptionCategory, number>> = {
  ai_tools: 3400,
  productivity: 6500,
  entertainment: 4500
};

/**
 * Converts amountMinor from one supported currency to another using a
 * fixed-base rate table. Returns null (never a fabricated number) when no
 * rate exists for either currency — callers must treat null as "exclude,"
 * not zero.
 */
export function convertMinor(amountMinor: number, from: CurrencyCode, to: CurrencyCode, rates: ExchangeRates): number | null {
  if (from === to) {
    return amountMinor;
  }
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) {
    return null;
  }
  return Math.round((amountMinor / fromRate) * toRate);
}

export function createSpendSummary(subscriptions: Subscription[], now = new Date(), fx?: FxContext): SpendSummary {
  const active = subscriptions.filter((subscription) => subscription.status === "active");
  const categoryMap = new Map<SubscriptionCategory, { monthlyMinor: number; count: number; ids: string[] }>();
  let totalMonthlyMinor = 0;
  let excludedCurrencyCount = 0;

  for (const subscription of active) {
    const monthly = fx ? monthlyAmountIn(subscription, fx.homeCurrency, fx.rates) : monthlyAmount(subscription);
    if (monthly === null) {
      excludedCurrencyCount += 1;
      continue;
    }
    totalMonthlyMinor += monthly;
    const current = categoryMap.get(subscription.category) ?? { monthlyMinor: 0, count: 0, ids: [] };
    current.monthlyMinor += monthly;
    current.count += 1;
    current.ids.push(subscription.id);
    categoryMap.set(subscription.category, current);
  }

  const byCategory = [...categoryMap.entries()]
    .map(([category, value]) => ({ category, monthlyMinor: value.monthlyMinor, count: value.count }))
    .sort((a, b) => b.monthlyMinor - a.monthlyMinor);

  const summary: SpendSummary = {
    totalMonthlyMinor,
    byCategory,
    insights: [
      ...categoryBudgetInsights(categoryMap, fx?.homeCurrency),
      ...duplicateCategoryInsights(categoryMap),
      ...annualSavingsInsights(active),
      ...unusedReviewInsights(active, now),
      spendTwinInsight(totalMonthlyMinor, fx?.homeCurrency, fx?.rates)
    ].filter((insight): insight is SpendInsight => Boolean(insight))
  };

  if (fx) {
    summary.excludedCurrencyCount = excludedCurrencyCount;
  }

  return summary;
}

export function monthlyAmount(subscription: Subscription): number {
  if (subscription.billingCycle === "annual") {
    return Math.round(subscription.price.amountMinor / 12);
  }
  if (subscription.billingCycle === "weekly") {
    // 52 weeks / 12 months — 4.33 undercounts annualised weekly spend.
    return Math.round((subscription.price.amountMinor * 52) / 12);
  }
  if (subscription.billingCycle === "quarterly") {
    return Math.round(subscription.price.amountMinor / 3);
  }
  if (subscription.billingCycle === "monthly") {
    return subscription.price.amountMinor;
  }
  // trial / lifetime / unknown cycles have no predictable recurring monthly
  // charge, so they do not contribute to recurring monthly spend.
  return 0;
}

/**
 * Same recurring-cycle normalization as monthlyAmount, converted into
 * homeCurrency. Returns null when no usable rate exists for this
 * subscription's currency — the caller must exclude it from any sum, never
 * treat null as 0 (that would silently understate spend).
 */
export function monthlyAmountIn(subscription: Subscription, homeCurrency: CurrencyCode, rates: ExchangeRates): number | null {
  return convertMinor(monthlyAmount(subscription), subscription.price.currency, homeCurrency, rates);
}

function categoryBudgetInsights(categoryMap: Map<SubscriptionCategory, { monthlyMinor: number; count: number; ids: string[] }>, homeCurrency?: CurrencyCode): SpendInsight[] {
  return [...categoryMap.entries()].flatMap(([category, value]) => {
    const benchmark = profileBenchmarks[category];
    if (!benchmark || value.monthlyMinor <= benchmark) {
      return [];
    }

    const overage = value.monthlyMinor - benchmark;
    return [{
      kind: "category_over_budget",
      severity: "warning",
      title: `${labelCategory(category)} is above profile benchmark`,
      body: `You spend ${formatMoneyMinor(value.monthlyMinor, homeCurrency)} per month; the profile benchmark is ${formatMoneyMinor(benchmark, homeCurrency)}.`,
      subscriptionIds: value.ids,
      estimatedMonthlyImpactMinor: overage
    }];
  });
}

function duplicateCategoryInsights(categoryMap: Map<SubscriptionCategory, { monthlyMinor: number; count: number; ids: string[] }>): SpendInsight[] {
  return [...categoryMap.entries()].flatMap(([category, value]) => {
    if (value.count < 3 || !["ai_tools", "productivity", "entertainment"].includes(category)) {
      return [];
    }

    return [{
      kind: "duplicate_category",
      severity: "opportunity",
      title: `Review overlap in ${labelCategory(category)}`,
      body: `${value.count} active subscriptions sit in this category. Consolidating one could lower monthly spend.`,
      subscriptionIds: value.ids
    }];
  });
}

function annualSavingsInsights(subscriptions: Subscription[]): SpendInsight[] {
  return subscriptions.flatMap((subscription) => {
    if (subscription.billingCycle !== "monthly" || subscription.price.amountMinor < 1000) {
      return [];
    }

    const estimate = Math.round(subscription.price.amountMinor * 12 * 0.18 / 12);
    const insight: SpendInsight = {
      kind: "annual_savings",
      severity: "opportunity",
      title: `Check annual pricing for ${subscription.name}`,
      body: `If annual billing saves 18%, this could reduce spend by about ${formatMoneyMinor(estimate, subscription.price.currency)} per month.`,
      subscriptionIds: [subscription.id],
      estimatedMonthlyImpactMinor: estimate
    };

    return [insight];
  }).slice(0, 4);
}

function unusedReviewInsights(subscriptions: Subscription[], now: Date): SpendInsight[] {
  return subscriptions.flatMap((subscription) => {
    if (!subscription.lastChargedDate || subscription.valueRating === "high") {
      return [];
    }
    const daysSinceCharge = Math.floor((now.getTime() - Date.parse(subscription.lastChargedDate)) / 86_400_000);
    if (daysSinceCharge < 30) {
      return [];
    }
    return [{
      kind: "unused_review",
      severity: "info",
      title: `Confirm value for ${subscription.name}`,
      body: `No recent value signal is available and the last charge is ${daysSinceCharge} days old.`,
      subscriptionIds: [subscription.id]
    }];
  });
}

function spendTwinInsight(totalMonthlyMinor: number, homeCurrency?: CurrencyCode, rates?: ExchangeRates): SpendInsight | null {
  if (totalMonthlyMinor <= 0) {
    return null;
  }
  // 1000 minor units == one $10 burrito — a USD-denominated comparison unit.
  // Convert it into homeCurrency (via the same rates table) rather than
  // comparing raw minor units of two different currencies.
  const burritoCostMinor = homeCurrency && homeCurrency !== "USD" && rates
    ? convertMinor(1000, "USD", homeCurrency, rates) ?? 1000
    : 1000;
  const burritos = Math.max(1, Math.round(totalMonthlyMinor / burritoCostMinor));
  return {
    kind: "spend_twin",
    severity: "info",
    title: "Spend Twin",
    body: `Your subscriptions equal about ${burritos} burritos, a weekend flight fund, or a month of gym membership.`,
    subscriptionIds: []
  };
}

function labelCategory(category: SubscriptionCategory): string {
  return category.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
