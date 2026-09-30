import { convertMinor, monthlyAmount, monthlyAmountIn, type FxContext, type Subscription, type SubscriptionCategory } from "@zeno/shared";

export interface CalendarDot {
  key: string;
  color: string;
  selectedDotColor?: string;
}

export interface MarkedDate {
  dots: CalendarDot[];
  marked: boolean;
}

type DateCategory = "streaming" | "ai_tools" | "productivity" | "gaming" | "health" | "education" | "music" | "other";

const DAY_MS = 24 * 60 * 60 * 1000;

type DatedSubscription = Subscription & { nextRenewalDate: string };

// The calendar only ever shows active subscriptions that have a renewal date.
// Narrowing the type here means no caller has to re-check nextRenewalDate.
function activeWithRenewal(subscriptions: Subscription[]): DatedSubscription[] {
  return subscriptions.filter((item): item is DatedSubscription => item.status === "active" && !!item.nextRenewalDate);
}

function normalizeDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// UTC midnight of the instant's UTC day. Renewal dates are UTC days (§10), and
// UTC has no DST, so the gap between two of these is an exact number of days.
// (Local midnights made a spring-forward "day" 23 hours long, losing a day, and
// disagreed with getDaysRemaining's UTC countdown west of UTC.)
function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function dayDiffISO(dateValue: string, fromDate: Date): number | null {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((utcDayStart(date) - utcDayStart(fromDate)) / DAY_MS);
}

function mapCategoryToColor(category: SubscriptionCategory): string {
  const effective: DateCategory = category === "entertainment"
    ? "streaming"
    : category === "developer_tools" || category === "family"
      ? "other"
      : category as DateCategory;

  switch (effective) {
    case "streaming":
      return "#EF4444";
    case "ai_tools":
      return "#8B5CF6";
    case "productivity":
      return "#3B82F6";
    case "gaming":
      return "#10B981";
    case "health":
      return "#F59E0B";
    case "education":
      return "#06B6D4";
    case "music":
      return "#EC4899";
    case "other":
    default:
      return "#6B7280";
  }
}

export function getMarkedDates(subscriptions: Subscription[]): Record<string, MarkedDate> {
  const grouped: Record<string, MarkedDate> = {};

  for (const subscription of activeWithRenewal(subscriptions)) {
    const dateKey = normalizeDate(subscription.nextRenewalDate);
    if (!dateKey) {
      continue;
    }

    const nextDots = grouped[dateKey]?.dots ?? [];
    const dotColor = mapCategoryToColor(subscription.category);
    grouped[dateKey] = {
      marked: true,
      dots: [
        ...nextDots,
        {
          key: subscription.id,
          color: dotColor
        }
      ]
    };
  }

  return grouped;
}

export function getSubscriptionsForDate(subscriptions: Subscription[], dateString: string): Subscription[] {
  const target = normalizeDate(dateString);
  if (!target) {
    return [];
  }

  return activeWithRenewal(subscriptions)
    .filter((subscription) => normalizeDate(subscription.nextRenewalDate) === target)
    .sort((a, b) => Number(a.price.amountMinor) - Number(b.price.amountMinor));
}

export function getMonthlyTotal(subscriptions: Subscription[], year: number, month: number, fx?: FxContext): number {
  return activeWithRenewal(subscriptions)
    .reduce((sum, subscription) => {
      const key = normalizeDate(subscription.nextRenewalDate);
      if (!key) {
        return sum;
      }
      const [dateYear, dateMonth] = key.split("-").map((value) => Number(value));
      if (dateYear !== year || dateMonth !== month) {
        return sum;
      }

      // Never silently sum raw minor units across currencies — convert (or
      // skip, never fabricate) when fx is available; unconverted fallback
      // preserves the pre-5.2 behavior when it isn't.
      const amountMinor = fx ? convertMinor(subscription.price.amountMinor, subscription.price.currency, fx.homeCurrency, fx.rates) : subscription.price.amountMinor;
      return amountMinor === null ? sum : sum + amountMinor / 100;
    }, 0);
}

export function getWeeklyGroups(subscriptions: Subscription[]): {
  thisWeek: Subscription[];
  nextWeek: Subscription[];
  laterThisMonth: Subscription[];
} {
  const today = new Date();
  const groups = {
    thisWeek: [] as DatedSubscription[],
    nextWeek: [] as DatedSubscription[],
    laterThisMonth: [] as DatedSubscription[]
  };

  for (const subscription of activeWithRenewal(subscriptions)) {
    const diff = dayDiffISO(subscription.nextRenewalDate, today);
    if (diff === null || diff < 0) {
      continue;
    }

    if (diff <= 7) {
      groups.thisWeek.push(subscription);
      continue;
    }

    if (diff <= 14) {
      groups.nextWeek.push(subscription);
      continue;
    }

    if (diff <= 30) {
      groups.laterThisMonth.push(subscription);
    }
  }

  // Every grouped date parsed successfully (dayDiffISO returned a number).
  const sortByDate = (a: DatedSubscription, b: DatedSubscription) => Date.parse(a.nextRenewalDate) - Date.parse(b.nextRenewalDate);

  return {
    thisWeek: groups.thisWeek.sort(sortByDate),
    nextWeek: groups.nextWeek.sort(sortByDate),
    laterThisMonth: groups.laterThisMonth.sort(sortByDate)
  };
}

export function getProjectedAnnual(subscriptions: Subscription[], fx?: FxContext): number {
  const now = new Date();
  // UTC year and month, like the renewal days themselves (§10).
  const currentYear = now.getUTCFullYear();
  const remainingMonths = 12 - now.getUTCMonth();
  let projected = 0;

  for (const subscription of activeWithRenewal(subscriptions)) {
    const nextRenewal = new Date(subscription.nextRenewalDate);
    if (Number.isNaN(nextRenewal.getTime())) {
      continue;
    }

    // Both branches convert into the home currency (or skip, never fabricate)
    // so a mixed-currency portfolio isn't silently summed in raw minor units.
    const cycle = subscription.billingCycle;
    if (cycle === "annual" || cycle === "trial") {
      // One known charge — the annual renewal, or the trial converting to
      // paid — counted once, and only if it lands in the current year.
      if (nextRenewal.getUTCFullYear() !== currentYear) {
        continue;
      }
      const amountMinor = fx ? convertMinor(subscription.price.amountMinor, subscription.price.currency, fx.homeCurrency, fx.rates) : subscription.price.amountMinor;
      if (amountMinor !== null) {
        projected += amountMinor / 100;
      }
      continue;
    }

    // Recurring cycles project their monthly equivalent over the remaining
    // months (weekly × 52/12, quarterly ÷ 3 — the shared monthlyAmount rule).
    // Treating every cycle as monthly made a quarterly plan 3× too high and a
    // weekly one ~4× too low; "unknown" has no predictable charge, so it adds 0.
    const monthlyMinor = fx ? monthlyAmountIn(subscription, fx.homeCurrency, fx.rates) : monthlyAmount(subscription);
    if (monthlyMinor !== null) {
      projected += (monthlyMinor / 100) * remainingMonths;
    }
  }

  return projected;
}
