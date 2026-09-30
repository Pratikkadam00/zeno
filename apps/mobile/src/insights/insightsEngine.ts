import { getServiceById, getServiceBySlug } from "@zeno/service-catalog";
import { convertMinor, monthlyAmount, monthlyAmountIn, type FxContext, type Subscription } from "@zeno/shared";
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

      const daysUnused = -daysFromToday(lastUsed);
      if (daysUnused <= 30) {
        return [];
      }

      const monthly = monthlyDollars(subscription);
      // savingAmount feeds cross-insight aggregation in getTotalSavingOpportunity,
      // so it must be expressed in fx.homeCurrency, not this subscription's own
      // currency — exclude (undefined, never fabricate) when no usable rate
      // exists. The message keeps showing the subscription's own native
      // currency/amount regardless, since that doesn't depend on conversion.
      return [{
        daysUnused,
        insight: createInsight({
          id: `unused-${subscription.id}`,
          type: "unused",
          title: `Not used in ${daysUnused} days`,
          message: `${subscription.name} is ${formatMoney(monthly, subscription.price.currency)}/mo but you haven't opened it in ${daysUnused} days. Still worth it?`,
          savingAmount: monthlyDollarsIn(subscription, fx) ?? undefined,
          subscriptionId: subscription.id,
          priority: daysUnused > 60 ? "high" : "medium",
          actionLabel: "Cancel Subscription",
          actionRoute: `/subscription/cancel/${subscription.id}`
        })
      }];
    })
    // Sort on the computed count, not a number parsed back out of the title.
    .sort((a, b) => b.daysUnused - a.daysUnused)
    .slice(0, 3)
    .map(({ insight }) => insight);
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
      // length >= 2 was checked above, so both exist.
      const [first, second] = ranked;

      const amountA = monthlyDollars(first);
      const amountB = monthlyDollars(second);
      // savingAmount/priority feed cross-insight comparisons, so they must use
      // fx.homeCurrency-comparable values, not amountA/amountB's native-currency
      // figures. Exclude (undefined/legacy-medium) rather than fabricate when
      // either subscription's currency has no usable rate.
      const comparableA = monthlyDollarsIn(first, fx);
      const comparableB = monthlyDollarsIn(second, fx);
      const savingAmount = comparableA !== null && comparableB !== null ? Math.min(comparableA, comparableB) : undefined;
      // "High" means both cost more than $10/mo. The bar is converted into the
      // home currency like every benchmark here: a bare 10 was ₹10 (about 12 US
      // cents) for an INR user, so nearly every INR duplicate ranked "high".
      // No rate to convert the bar with → no "high" claim.
      const highBar = benchmarkIn(10, fx);
      const bothAboveBar = highBar !== null && comparableA !== null && comparableB !== null && comparableA > highBar && comparableB > highBar;
      return [createInsight({
        id: `duplicate-${category}-${first.id}-${second.id}`,
        type: "duplicate",
        title: `Two ${toolsPhrase(category)}`,
        message: `You pay for both ${first.name} (${formatMoney(amountA, first.price.currency)}) and ${second.name} (${formatMoney(amountB, second.price.currency)}). Could you replace one?`,
        savingAmount,
        subscriptionIds: [first.id, second.id],
        priority: bothAboveBar ? "high" : "medium",
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

      return [{
        saving,
        insight: createInsight({
          id: `annual-${subscription.id}`,
          type: "annual_saving",
          title: `Save ${formatMoney(saving, subscription.price.currency)}/year on ${subscription.name}`,
          message: `Switching ${subscription.name} to annual billing saves ${formatMoney(saving, subscription.price.currency)}/year (${formatMoney(saving / 12, subscription.price.currency)}/month).`,
          savingAmount: roundMoney(saving),
          subscriptionId: subscription.id,
          priority: saving > 50 ? "high" : "medium",
          actionLabel: "Switch to Annual",
          actionRoute: `/subscription/${subscription.id}`
        })
      }];
    })
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 3)
    .map(({ insight }) => insight);
}

// A free trial is a subscription on the "trial" billing cycle whose
// nextRenewalDate is the date it converts to a paid charge — mirroring
// packages/shared/src/trials/trial-guardian.ts's getEndingTrials. (Earlier this
// checked isTrial/trialEndDate fields the real Subscription model never had, so
// this insight could never fire.)
export function detectTrialEnding(subscriptions: Subscription[]): Insight[] {
  return subscriptions
    .flatMap((subscription) => {
      if (subscription.billingCycle !== "trial") return [];
      if (subscription.status === "cancelled" || subscription.status === "paused") return [];
      if (!subscription.nextRenewalDate) return [];

      const trialEnd = Date.parse(subscription.nextRenewalDate);
      if (Number.isNaN(trialEnd)) {
        return [];
      }

      const daysUntilEnd = daysFromToday(trialEnd);
      if (daysUntilEnd < 0 || daysUntilEnd > 7) {
        return [];
      }

      // The trial converts into a charge of the plan's stored price. (This used
      // monthlyDollars(), which is 0 for the "trial" cycle by definition, so every
      // one of these messages said "avoid being charged $0".) An unknown price
      // (0) gets no figure rather than a made-up one.
      const priceMinor = subscription.price.amountMinor;
      const chargeText = priceMinor > 0 ? ` ${formatMoney(priceMinor / 100, subscription.price.currency)}` : "";
      return [{
        trialEnd,
        insight: createInsight({
          id: `trial-${subscription.id}`,
          type: "trial_ending",
          title: `Trial ends in ${daysUntilEnd} days`,
          message: `${subscription.name} free trial ends ${formatDate(trialEnd)}. Cancel now to avoid being charged${chargeText}.`,
          subscriptionId: subscription.id,
          priority: daysUntilEnd <= 2 ? "high" : "medium",
          actionLabel: "Cancel Before Charged",
          actionRoute: `/subscription/cancel/${subscription.id}`
        })
      }];
    })
    .sort((a, b) => a.trialEnd - b.trialEnd)
    .map(({ insight }) => insight);
}

export function detectHighSpend(subscriptions: Subscription[], fx?: FxContext): Insight[] {
  const spendByCategory = new Map<BenchmarkCategory, number>();
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
      // categoryBenchmarks are fixed, USD-denominated constants (this app has
      // no currency-aware per-user pricing config). spend above is already
      // fx-converted into fx.homeCurrency, so the benchmark must be too before
      // comparing/subtracting — otherwise a non-USD homeCurrency (INR at
      // ~83:1, say) would compare a home-currency figure against a USD-scale
      // constant and fire a nonsensical "high spend" alert for ordinary spend.
      // If the benchmark cannot be converted, skip the category: comparing
      // against (and printing) the raw USD figure with the home currency's
      // symbol would show "₹40/mo" for what is really $40.
      const benchmark = benchmarkIn(categoryBenchmarks[category], fx);
      if (benchmark === null || spend <= benchmark * 1.5) {
        return [];
      }

      // The benchmark is a fixed figure Zeno chose, not a measured average of
      // anyone's spend, so the copy must not call it an "average".
      const overage = roundMoney(spend - benchmark);
      return [{
        overage,
        insight: createInsight({
          id: `high-spend-${category}`,
          type: "high_spend",
          title: `High spend on ${labelCategory(category)}`,
          message: `You spend ${formatMoney(spend, fx?.homeCurrency)}/mo on ${toolsPhrase(category)}. Zeno's benchmark for this category is ${formatMoney(benchmark, fx?.homeCurrency)}/mo.`,
          savingAmount: overage,
          subscriptionIds: activeSubscriptions(subscriptions)
            .filter((subscription) => benchmarkCategory(subscription) === category)
            .map((subscription) => subscription.id),
          priority: "medium",
          actionLabel: "Review",
          actionRoute: "/analytics"
        })
      }];
    })
    .sort((a, b) => b.overage - a.overage)
    .slice(0, 2)
    .map(({ insight }) => insight);
}

export function generateSpendSummary(subscriptions: Subscription[], fx?: FxContext): Insight {
  const active = activeSubscriptions(subscriptions);
  let totalMonthly = 0;
  let excludedCurrencyCount = 0;
  const priced: { subscription: Subscription; amount: number }[] = [];
  for (const subscription of active) {
    const amount = monthlyDollarsIn(subscription, fx);
    if (amount === null) {
      excludedCurrencyCount += 1;
      continue;
    }
    totalMonthly += amount;
    priced.push({ subscription, amount });
  }
  totalMonthly = roundMoney(totalMonthly);

  // Only subscriptions with a comparable (converted) amount can be "biggest".
  const mostExpensive = priced.sort((a, b) => b.amount - a.amount)[0]?.subscription;
  const topCategory = getTopCategory(active, fx);
  const renewingThisWeek = active.filter((subscription) => {
    const renews = Date.parse(subscription.nextRenewalDate ?? "");
    if (Number.isNaN(renews)) {
      return false;
    }
    const days = daysFromToday(renews);
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
    .flatMap((subscription) => {
      if (subscription.status !== "cancelled") {
        return [];
      }
      // No parseable end date means nothing true to say about "active until".
      // (An unparseable date used to count as +Infinity days away, which passed
      // the ">= 0" test, so the reminder claimed access "continues until the
      // renewal date" — a date the app does not know.)
      const accessEnds = Date.parse(subscription.nextRenewalDate ?? "");
      if (Number.isNaN(accessEnds) || daysFromToday(accessEnds) < 0) {
        return [];
      }
      return [{ subscription, accessEnds }];
    })
    .sort((a, b) => a.accessEnds - b.accessEnds)
    .slice(0, 2)
    .map(({ subscription, accessEnds }) => createInsight({
      id: `cancel-reminder-${subscription.id}`,
      type: "cancellation_reminder",
      title: `${subscription.name} cancelled - active until ${formatDate(accessEnds)}`,
      message: `Your access continues until ${formatDate(accessEnds)}. After that you save ${formatMoney(monthlyDollars(subscription), subscription.price.currency)}/mo.`,
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

  // The loop returns as soon as 8 are collected, so fewer than 8 remain here
  // and the summary always fits.
  return [...deduped, summary];
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

// categoryBenchmarks are fixed, USD-denominated dollar amounts (e.g. 40, not
// 4000 minor units). Converts one into fx.homeCurrency via the same rate
// table used for the subscriptions being compared against it — comparing an
// already-converted spend figure to a raw USD constant would silently
// mis-scale for any homeCurrency far from 1:1 with USD (INR at ~83:1, say).
// Returns null when the rate table cannot convert USD into the home currency —
// which does happen: a subscription already in the home currency converts
// without any rate (from === to), so a table missing the home currency's rate
// still yields home-currency spend. Callers must then skip the comparison;
// the raw USD figure is never a stand-in for a home-currency one.
function benchmarkIn(benchmarkUsdDollars: number, fx: FxContext | undefined): number | null {
  if (!fx) {
    return benchmarkUsdDollars;
  }
  const convertedMinor = convertMinor(Math.round(benchmarkUsdDollars * 100), "USD", fx.homeCurrency, fx.rates);
  return convertedMinor === null ? null : roundMoney(convertedMinor / 100);
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

// Whole UTC days from today to the instant's UTC day (negative = in the past).
// Renewal dates are UTC days (standards §10) and the shared Trial Guardian and
// getDaysRemaining count the same way. UTC has no DST, so the gap between two
// UTC midnights is exact; local midnights made a DST day 23 or 25 hours long,
// which shifted counts by one.
function daysFromToday(timestamp: number): number {
  return Math.round((utcDayStart(timestamp) - utcDayStart(Date.now())) / dayMs);
}

function utcDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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

// Dollar-valued (not minor units), adaptive precision (whole numbers show no
// cents) — distinct from utils/format.ts's minor-unit formatMoney, which this
// file's insight messages predate. currency defaults to "USD" for aggregate
// figures (summed across possibly-mixed-currency subscriptions — genuine
// per-currency aggregation is out of scope here); per-subscription messages
// pass that subscription's own stored currency.
function formatMoney(value: number, currency = "USD"): string {
  return `${currencySymbol(currency)}${roundMoney(value).toFixed(value % 1 === 0 ? 0 : 2)}`;
}

// Callers pass an already-parsed, valid timestamp, so there is no fallback text.
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Lower-case for mid-sentence use ("on productivity tools"), except the
// acronym: "ai_tools" → "AI tools".
function labelCategory(category: string): string {
  return category === "ai_tools" ? "AI tools" : category.replace(/_/g, " ");
}

// "<category> tools" — without a second "tools" for categories already named
// "… tools" (the templates used to render "Two ai tools tools").
function toolsPhrase(category: string): string {
  const label = labelCategory(category);
  return label.endsWith(" tools") ? label : `${label} tools`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

