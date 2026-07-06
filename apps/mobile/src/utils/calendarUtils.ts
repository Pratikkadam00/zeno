import { convertMinor, type FxContext, type Subscription, type SubscriptionCategory } from "@zeno/shared";

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

function withStartOfToday(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDiffISO(dateValue: string, fromDate: Date): number | null {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const startFrom = withStartOfToday(fromDate);
  const target = withStartOfToday(date);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((target.getTime() - startFrom.getTime()) / dayMs);
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

  for (const subscription of subscriptions.filter((item) => item.status === "active" && !!item.nextRenewalDate)) {
    const nextRenewalDate = subscription.nextRenewalDate;
    if (!nextRenewalDate) {
      continue;
    }

    const dateKey = normalizeDate(nextRenewalDate);
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

  return subscriptions
    .filter((subscription) => subscription.status === "active" && !!subscription.nextRenewalDate)
    .filter((subscription) => {
      const renewal = normalizeDate(subscription.nextRenewalDate ?? "");
      return renewal === target;
    })
    .sort((a, b) => Number(a.price.amountMinor) - Number(b.price.amountMinor));
}

export function getMonthlyTotal(subscriptions: Subscription[], year: number, month: number, fx?: FxContext): number {
  return subscriptions
    .filter((subscription) => subscription.status === "active" && !!subscription.nextRenewalDate)
    .reduce((sum, subscription) => {
      if (!subscription.nextRenewalDate) {
        return sum;
      }

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
  const today = withStartOfToday(new Date());
  const groups = {
    thisWeek: [] as Subscription[],
    nextWeek: [] as Subscription[],
    laterThisMonth: [] as Subscription[]
  };

  for (const subscription of subscriptions.filter((item) => item.status === "active" && !!item.nextRenewalDate)) {
    const nextRenewalDate = subscription.nextRenewalDate ?? "";
    const diff = dayDiffISO(nextRenewalDate, today);
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

  const sortByDate = (a: Subscription, b: Subscription) => {
    const dateA = a.nextRenewalDate ? Number(new Date(a.nextRenewalDate)) : 0;
    const dateB = b.nextRenewalDate ? Number(new Date(b.nextRenewalDate)) : 0;
    return dateA - dateB;
  };

  return {
    thisWeek: groups.thisWeek.sort(sortByDate),
    nextWeek: groups.nextWeek.sort(sortByDate),
    laterThisMonth: groups.laterThisMonth.sort(sortByDate)
  };
}

export function getProjectedAnnual(subscriptions: Subscription[]): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  let projected = 0;

  for (const subscription of subscriptions.filter((subscription) => subscription.status === "active")) {
    if (!subscription.nextRenewalDate) {
      continue;
    }

    const amount = subscription.price.amountMinor / 100;
    const nextRenewal = new Date(subscription.nextRenewalDate);
    if (Number.isNaN(nextRenewal.getTime())) {
      continue;
    }

    if (subscription.billingCycle === "annual") {
      if (nextRenewal.getFullYear() === currentYear) {
        projected += amount;
      }
      continue;
    }

    if (subscription.billingCycle === "monthly") {
      const remainingMonths = 12 - now.getMonth();
      projected += amount * remainingMonths;
      continue;
    }

    projected += amount * (12 - now.getMonth());
  }

  return projected;
}
