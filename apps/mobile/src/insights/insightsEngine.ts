import { getServiceById, getServiceBySlug } from "@zeno/service-catalog";
import { monthlyAmount, monthlyAmountIn, type FxContext, type Subscription } from "@zeno/shared";
import { currencySymbol } from "../utils/format";

export interface Insight {
  id: string;
  type:
    | "unused"
    | "duplicate"
    | "annual_saving"
    | "trial_ending"
    | "price_spike"
    | "spend_summary"
    | "high_spend"
    | "cancellation_reminder";
  title: string;
  message: string;
  savingAmount?: number;
  subscriptionId?: string;
  subscriptionIds?: string[];
  priority: "high" | "medium" | "low";
  actionLabel?: string;
  actionRoute?: string;
  createdAt: string;
}

type InsightSubscription = Subscription & {
  lastUsedDate?: string;
};

type BenchmarkCategory =
  | "streaming"
  | "ai_tools"
  | "productivity"
  | "gaming"
  | "health"
  | "education"
  | "music"
  | "other";

const dayMs = 24 * 60 * 60 * 1000;
const categoryBenchmarks: Record<BenchmarkCategory, number> = {
  streaming: 25,
  ai_tools: 30,
  productivity: 40,
  gaming: 20,
  health: 30,
  education: 25,
  music: 15,
  other: 20
};

export function detectUnused(subscriptions: Subscription[], fx?: FxContext): Insight[] {
  const today = startOfToday();
  return activeSubscriptions(subscriptions)
    .flatMap((subscription) => {
      const lastUsedDate = (subscription as InsightSubscription).lastUsedDate;
      if (!lastUsedDate) {
        return [];
      }

      const lastUsed = Date.parse(lastUsedDate);
      if (Number.isNaN(lastUsed)) {
        return [];
      }

      const daysUnused = Math.floor((today.getTime() - startOfDay(new Date(lastUsed)).getTime()) / dayMs);
      if (daysUnused <= 30) {
        return [];
      }

      const monthly = monthlyDollars(subscription);
      // savingAmount feeds cross-insight aggregation in getTotalSavingOpportunity,
      // so it must be expressed in fx.homeCurrency, not this subscription's own
      // currency — exclude (undefined, never fabricate) when no usable rate
      // exists. The message keeps showing the subscription's own native
      // currency/amount regardless, since that doesn't depend on conversion.
      return [createInsight({
        id: `unused-${subscription.id}`,
        type: "unused",
        title: `Not used in ${daysUnused} days`,
        message: `${subscription.name} is ${formatMoney(monthly, subscription.price.currency)}/mo but you haven't opened it in ${daysUnused} days. Still worth it?`,
        savingAmount: monthlyDollarsIn(subscription, fx) ?? undefined,
        subscriptionId: subscription.id,
        priority: daysUnused > 60 ? "high" : "medium",
        actionLabel: "Cancel Subscription",
        actionRoute: `/subscription/cancel/${subscription.id}`
      })];
    })
    .sort((a, b) => extractDays(b.title) - extractDays(a.title))
    .slice(0, 3);
}

export function detectDuplicates(subscriptions: Subscription[], fx?: FxContext): Insight[] {
  const byCategory = new Map<string, Subscription[]>();
  for (const subscription of activeSubscriptions(subscriptions)) {
    if (subscription.category === "other") {
      continue;
    }
    byCategory.set(subscription.category, [...(byCategory.get(subscription.category) ?? []), subscription]);
  }

  return [...byCategory.entries()]
    .flatMap(([category, categorySubscriptions]) => {
      if (categorySubscriptions.length < 2) {
        return [];
      }

      // Rank by fx-converted monthly amount (native amount when fx is
      // omitted, matching legacy behavior) — comparing raw minor units across
      // different currencies would misrank which two are actually "biggest."
      const ranked = [...categorySubscriptions].sort((a, b) => {
        const rankA = fx ? monthlyAmountIn(a, fx.homeCurrency, fx.rates) : monthlyAmount(a);
        const rankB = fx ? monthlyAmountIn(b, fx.homeCurrency, fx.rates) : monthlyAmount(b);
        return (rankB ?? -Infinity) - (rankA ?? -Infinity);
      });
      const [first, second] = ranked;
      if (!first || !second) {
        return [];
      }

      const amountA = monthlyDollars(first);
      const amountB = monthlyDollars(second);
      // savingAmount/priority feed cross-insight comparisons, so they must use
      // fx.homeCurrency-comparable values, not amountA/amountB's native-currency
      // figures. Exclude (undefined/legacy-medium) rather than fabricate when
      // either subscription's currency has no usable rate.
      const comparableA = monthlyDollarsIn(first, fx);
      const comparableB = monthlyDollarsIn(second, fx);
      const savingAmount = comparableA !== null && comparableB !== null ? Math.min(comparableA, comparableB) : undefined;
      return [createInsight({
        id: `duplicate-${category}-${first.id}-${second.id}`,
        type: "duplicate",
        title: `Two ${labelCategory(category)} tools`,
        message: `You pay for both ${first.name} (${formatMoney(amountA, first.price.currency)}) and ${second.name} (${formatMoney(amountB, second.price.currency)}). Could you replace one?`,
        savingAmount,
        subscriptionIds: [first.id, second.id],
        priority: (comparableA ?? 0) > 10 && (comparableB ?? 0) > 10 ? "high" : "medium",
        actionLabel: "Compare",
        actionRoute: "/analytics"
      })];
    })
    .sort((a, b) => (b.savingAmount ?? 0) - (a.savingAmount ?? 0))
    .slice(0, 3);
}

export function detectAnnualSavings(subscriptions: Subscription[]): Insight[] {
  return activeSubscriptions(subscriptions)
    .flatMap((subscription) => {
      if (subscription.billingCycle !== "monthly") {
        return [];
      }

      const service = findService(subscription);
      if (!service?.defaultAnnualPrice) {
        return [];
      }
      // The catalog's default prices are USD-denominated (no currency field on
      // Service) — comparing them against a non-USD subscription's amount would
      // produce a meaningless "saving" figure, so skip rather than show a wrong
      // number with a currency label that makes it look more legitimate.
      if (subscription.price.currency !== "USD") {
        return [];
      }

      const annualIfPaidMonthly = monthlyDollars(subscription) * 12;
      const saving = annualIfPaidMonthly - service.defaultAnnualPrice;
      if (saving <= 10) {
        return [];
      }

      return [createInsight({
        id: `annual-${subscription.id}`,
        type: "annual_saving",
        title: `Save ${formatMoney(saving, subscription.price.currency)}/year on ${subscription.name}`,
        message: `Switching ${subscription.name} to annual billing saves ${formatMoney(saving, subscription.price.currency)}/year (${formatMoney(saving / 12, subscription.price.currency)}/month).`,
        savingAmount: roundMoney(saving),
        subscriptionId: subscription.id,
        priority: saving > 50 ? "high" : "medium",
        actionLabel: "Switch to Annual",
        actionRoute: `/subscription/${subscription.id}`
      })];
    })
    .sort((a, b) => (b.savingAmount ?? 0) - (a.savingAmount ?? 0))
    .slice(0, 3);
}

// A free trial is a subscription on the "trial" billing cycle whose
// nextRenewalDate is the date it converts to a paid charge — mirroring
// packages/shared/src/trials/trial-guardian.ts's getEndingTrials. (Earlier this
// checked isTrial/trialEndDate fields the real Subscription model never had, so
// this insight could never fire.)
export function detectTrialEnding(subscriptions: Subscription[]): Insight[] {
  const today = startOfToday();
  return subscriptions
    .flatMap((subscription) => {
      if (subscription.billingCycle !== "trial") return [];
      if (subscription.status === "cancelled" || subscription.status === "paused") return [];
      if (!subscription.nextRenewalDate) return [];

      const trialEnd = Date.parse(subscription.nextRenewalDate);
      if (Number.isNaN(trialEnd)) {
        return [];
      }

      const daysUntilEnd = Math.ceil((startOfDay(new Date(trialEnd)).getTime() - today.getTime()) / dayMs);
      if (daysUntilEnd < 0 || daysUntilEnd > 7) {
        return [];
      }

      const monthly = monthlyDollars(subscription);
      return [createInsight({
        id: `trial-${subscription.id}`,
        type: "trial_ending",
        title: `Trial ends in ${daysUntilEnd} days`,
        message: `${subscription.name} free trial ends ${formatDate(subscription.nextRenewalDate)}. Cancel now to avoid being charged ${formatMoney(monthly, subscription.price.currency)}.`,
        subscriptionId: subscription.id,
        priority: daysUntilEnd <= 2 ? "high" : "medium",
        actionLabel: "Cancel Before Charged",
        actionRoute: `/subscription/cancel/${subscription.id}`
      })];
    })
    .sort((a, b) => Date.parse(getSubscriptionTrialEnd(subscriptions, a.subscriptionId)) - Date.parse(getSubscriptionTrialEnd(subscriptions, b.subscriptionId)));
}

export function detectHighSpend(subscriptions: Subscription[], fx?: FxContext): Insight[] {
  const spendByCategory = new Map<string, number>();
  for (const subscription of activeSubscriptions(subscriptions)) {
    const category = benchmarkCategory(subscription);
    const amount = monthlyDollarsIn(subscription, fx);
    if (amount === null) {
      continue; // excluded: no usable rate for this subscription's currency
    }
    spendByCategory.set(category, (spendByCategory.get(category) ?? 0) + amount);
  }

  return [...spendByCategory.entries()]
    .flatMap(([category, spend]) => {
      const benchmark = categoryBenchmarks[category as BenchmarkCategory] ?? categoryBenchmarks.other;
      if (spend <= benchmark * 1.5) {
        return [];
      }

      return [createInsight({
        id: `high-spend-${category}`,
        type: "high_spend",
        title: `High spend on ${labelCategory(category)}`,
        message: `You spend ${formatMoney(spend, fx?.homeCurrency)}/mo on ${labelCategory(category)} tools. Average is around ${formatMoney(benchmark, fx?.homeCurrency)}/mo.`,
        savingAmount: roundMoney(spend - benchmark),
        subscriptionIds: activeSubscriptions(subscriptions)
          .filter((subscription) => benchmarkCategory(subscription) === category)
          .map((subscription) => subscription.id),
        priority: "medium",
        actionLabel: "Review",
        actionRoute: "/analytics"
      })];
    })
    .sort((a, b) => (b.savingAmount ?? 0) - (a.savingAmount ?? 0))
    .slice(0, 2);
}

export function generateSpendSummary(subscriptions: Subscription[], fx?: FxContext): Insight {
  const active = activeSubscriptions(subscriptions);
  let totalMonthly = 0;
  let excludedCurrencyCount = 0;
  for (const subscription of active) {
    const amount = monthlyDollarsIn(subscription, fx);
    if (amount === null) {
      excludedCurrencyCount += 1;
      continue;
    }
    totalMonthly += amount;
  }
  totalMonthly = roundMoney(totalMonthly);

  const mostExpensive = [...active]
    .filter((subscription) => monthlyDollarsIn(subscription, fx) !== null)
    .sort((a, b) => (monthlyDollarsIn(b, fx) ?? 0) - (monthlyDollarsIn(a, fx) ?? 0))[0];
  const topCategory = getTopCategory(active, fx);
  const renewingThisWeek = active.filter((subscription) => {
    if (!subscription.nextRenewalDate) {
      return false;
    }
    const days = daysUntil(subscription.nextRenewalDate);
    return days >= 0 && days <= 7;
  }).length;

  const topServiceText = mostExpensive
    ? `${mostExpensive.name} is your biggest at ${formatMoney(monthlyDollars(mostExpensive), mostExpensive.price.currency)}/mo.`
    : "No active subscriptions yet.";
  const categoryText = topCategory ? `${labelCategory(topCategory.category)} leads your category spend. ` : "";
  // Never silently folds excluded-currency subscriptions into the "across N
  // subscriptions" count — surfaces them explicitly instead, in the spirit of
  // coach.ts's createSpendSummary excludedCurrencyCount field (Insight has no
  // dedicated numeric field for this, so it's appended to the free-text message).
  const excludedText = excludedCurrencyCount > 0
    ? ` (${excludedCurrencyCount} more excluded — no exchange rate available)`
    : "";

  return createInsight({
    id: "spend-summary",
    type: "spend_summary",
    title: "Monthly overview",
    message: `You pay ${formatMoney(totalMonthly, fx?.homeCurrency)}/mo across ${active.length - excludedCurrencyCount} subscriptions${excludedText}. ${topServiceText} ${categoryText}${renewingThisWeek} renewals this week.`,
    priority: "low",
    actionLabel: "See breakdown",
    actionRoute: "/analytics"
  });
}

export function detectCancellationReminders(subscriptions: Subscription[], fx?: FxContext): Insight[] {
  return subscriptions
    .filter((subscription) => subscription.status === "cancelled" && subscription.nextRenewalDate && daysUntil(subscription.nextRenewalDate) >= 0)
    .sort((a, b) => Date.parse(a.nextRenewalDate ?? "") - Date.parse(b.nextRenewalDate ?? ""))
    .slice(0, 2)
    .map((subscription) => createInsight({
      id: `cancel-reminder-${subscription.id}`,
      type: "cancellation_reminder",
      title: `${subscription.name} cancelled - active until ${formatDate(subscription.nextRenewalDate)}`,
      message: `Your access continues until ${formatDate(subscription.nextRenewalDate)}. After that you save ${formatMoney(monthlyDollars(subscription), subscription.price.currency)}/mo.`,
      savingAmount: monthlyDollarsIn(subscription, fx) ?? undefined,
      subscriptionId: subscription.id,
      priority: "low"
    }));
}

export function generateInsights(subscriptions: Subscription[], fx?: FxContext): Insight[] {
  const summary = generateSpendSummary(subscriptions, fx);
  const candidates = [
    ...detectTrialEnding(subscriptions),
    ...detectUnused(subscriptions, fx),
    ...detectDuplicates(subscriptions, fx),
    ...detectAnnualSavings(subscriptions),
    ...detectHighSpend(subscriptions, fx),
    ...detectCancellationReminders(subscriptions, fx)
  ].sort(compareInsights);

  const usedSubscriptionIds = new Set<string>();
  const deduped: Insight[] = [];
  for (const insight of candidates) {
    const ids = insight.subscriptionId ? [insight.subscriptionId] : insight.subscriptionIds ?? [];
    if (ids.some((id) => usedSubscriptionIds.has(id))) {
      continue;
    }
    ids.forEach((id) => usedSubscriptionIds.add(id));
    deduped.push(insight);
    if (deduped.length >= 8) {
      return deduped;
    }
  }

  if (deduped.length < 8) {
    return [...deduped, summary].slice(0, 8);
  }

  return deduped.slice(0, 8);
}

// Sums each insight's savingAmount as-is. Correctness depends entirely on the
// caller having built `insights` via a single generateInsights(subscriptions, fx)
// call with one consistent fx context — every savingAmount here is then
// already expressed in fx.homeCurrency (or, if fx was omitted, in the legacy
// mixed-native-currency approximation, unchanged from pre-fix behavior). This
// function cannot itself verify that invariant — it has no per-insight currency.
export function getTotalSavingOpportunity(insights: Insight[]): number {
  return roundMoney(insights.reduce((sum, insight) => sum + (insight.savingAmount ?? 0), 0));
}

function createInsight(input: Omit<Insight, "createdAt">): Insight {
  return {
    ...input,
    createdAt: new Date().toISOString()
  };
}

function activeSubscriptions(subscriptions: Subscription[]): Subscription[] {
  return subscriptions.filter((subscription) => subscription.status === "active" || subscription.status === "trial");
}

function findService(subscription: Subscription) {
  if (subscription.serviceId) {
    return getServiceById(subscription.serviceId) ?? getServiceBySlug(subscription.serviceId);
  }
  if (subscription.serviceSlug) {
    return getServiceBySlug(subscription.serviceSlug) ?? getServiceById(subscription.serviceSlug);
  }
  return undefined;
}

function monthlyDollars(subscription: Subscription): number {
  return roundMoney(monthlyAmount(subscription) / 100);
}

// Same recurring-cycle normalization as monthlyDollars, converted into
// fx.homeCurrency when fx is supplied — mirrors packages/shared/src/spend/
// coach.ts's monthlyAmountIn/convertMinor pattern and
// apps/mobile/src/finance/budget.ts's computeBudgetForecast. Returns null
// (never a fabricated number) when no usable rate exists for this
// subscription's currency — callers must exclude it from any cross-subscription
// sum/comparison, never treat null as 0. When fx is omitted, falls back
// unchanged to the legacy monthlyDollars() value (native currency) for
// backward compatibility.
function monthlyDollarsIn(subscription: Subscription, fx: FxContext | undefined): number | null {
  if (!fx) {
    return monthlyDollars(subscription);
  }
  const minor = monthlyAmountIn(subscription, fx.homeCurrency, fx.rates);
  return minor === null ? null : roundMoney(minor / 100);
}

function benchmarkCategory(subscription: Subscription): BenchmarkCategory {
  const service = findService(subscription);
  const category = service?.category ?? subscription.category;
  if (category === "streaming" || category === "gaming" || category === "music") {
    return category;
  }
  if (category === "ai_tools" || category === "productivity" || category === "health" || category === "education") {
    return category;
  }
  if (category === "entertainment" || category === "family") {
    return "streaming";
  }
  if (category === "developer_tools") {
    return "productivity";
  }
  return "other";
}

function getTopCategory(subscriptions: Subscription[], fx?: FxContext): { category: string; spend: number } | null {
  const categorySpend = new Map<string, number>();
  for (const subscription of subscriptions) {
    const category = benchmarkCategory(subscription);
    const amount = monthlyDollarsIn(subscription, fx);
    if (amount === null) {
      continue;
    }
    categorySpend.set(category, (categorySpend.get(category) ?? 0) + amount);
  }
  const [category, spend] = [...categorySpend.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return category ? { category, spend } : null;
}

function getSubscriptionTrialEnd(subscriptions: Subscription[], id: string | undefined): string {
  const subscription = subscriptions.find((candidate) => candidate.id === id);
  return subscription?.nextRenewalDate ?? "";
}

function daysUntil(dateValue: string): number {
  const target = Date.parse(dateValue);
  if (Number.isNaN(target)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.ceil((startOfDay(new Date(target)).getTime() - startOfToday().getTime()) / dayMs);
}

function startOfToday(): Date {
  return startOfDay(new Date());
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function compareInsights(a: Insight, b: Insight): number {
  const priorityDelta = priorityRank(b.priority) - priorityRank(a.priority);
  return priorityDelta || (b.savingAmount ?? 0) - (a.savingAmount ?? 0) || a.title.localeCompare(b.title);
}

function priorityRank(priority: Insight["priority"]): number {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}

function extractDays(title: string): number {
  return Number.parseInt(title.match(/\d+/)?.[0] ?? "0", 10);
}

// Dollar-valued (not minor units), adaptive precision (whole numbers show no
// cents) — distinct from utils/format.ts's minor-unit formatMoney, which this
// file's insight messages predate. currency defaults to "USD" for aggregate
// figures (summed across possibly-mixed-currency subscriptions — genuine
// per-currency aggregation is out of scope here); per-subscription messages
// pass that subscription's own stored currency.
function formatMoney(value: number, currency = "USD"): string {
  return `${currencySymbol(currency)}${roundMoney(value).toFixed(value % 1 === 0 ? 0 : 2)}`;
}

function formatDate(dateValue: string | undefined): string {
  if (!dateValue) {
    return "the renewal date";
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "the renewal date";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function labelCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).toLowerCase();
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

