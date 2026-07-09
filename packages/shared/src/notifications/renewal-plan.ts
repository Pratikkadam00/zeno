import type { NotificationPreference, Subscription } from "../domain";

export type RenewalReminderKind = "seven_day" | "three_day" | "day_of";

export type RenewalReminderPlan = {
  kind: RenewalReminderKind;
  subscriptionId: string;
  serviceName: string;
  triggerAt: string;
  title: string;
  body: string;
  action: "view" | "cancel_now" | "confirm_charge";
};

export type ReminderPreferenceLookup = Partial<Record<RenewalReminderKind, Pick<NotificationPreference, "enabled" | "quietHoursStart" | "quietHoursEnd">>>;

export function createRenewalReminderPlan(
  subscriptions: Subscription[],
  now = new Date(),
  preferences: ReminderPreferenceLookup = {}
): RenewalReminderPlan[] {
  const nowMs = now.getTime();
  const plans: RenewalReminderPlan[] = [];

  for (const subscription of subscriptions) {
    if (subscription.status !== "active" || !subscription.nextRenewalDate) {
      continue;
    }

    const renewalDate = new Date(subscription.nextRenewalDate);
    if (Number.isNaN(renewalDate.getTime())) {
      continue;
    }

    // Weekly subscriptions renew every 7 days, so a 7-day and 3-day heads-up
    // would land inside the *previous* cycle and stack three overlapping
    // reminders every week — for weekly cadence only the day-of reminder is
    // useful. Monthly+ keep the full ladder.
    const specs: Array<{ kind: RenewalReminderKind; offsetDays: number }> = subscription.billingCycle === "weekly"
      ? [{ kind: "day_of", offsetDays: 0 }]
      : [
          { kind: "seven_day", offsetDays: 7 },
          { kind: "three_day", offsetDays: 3 },
          { kind: "day_of", offsetDays: 0 }
        ];

    for (const spec of specs) {
      const preference = preferences[spec.kind];
      if (preference && !preference.enabled) {
        continue;
      }

      const trigger = new Date(renewalDate);
      trigger.setUTCDate(trigger.getUTCDate() - spec.offsetDays);
      if (trigger.getTime() < nowMs) {
        continue;
      }

      // The day-of reminder must never be pushed PAST the renewal instant by
      // quiet hours (a "renews today" alert firing after the charge is
      // useless) — bound it by the renewal date.
      const adjustedTrigger = applyQuietHours(trigger, preference, spec.kind === "day_of" ? renewalDate : undefined);
      // Re-check after adjustment: the day-of clamp can move a trigger EARLIER
      // (to the same-day window end or the renewal instant), so a value that
      // passed the pre-adjustment guard can end up in the past.
      if (adjustedTrigger.getTime() < nowMs) {
        continue;
      }
      plans.push({
        kind: spec.kind,
        subscriptionId: subscription.id,
        serviceName: subscription.name,
        triggerAt: adjustedTrigger.toISOString(),
        title: titleFor(subscription.name, spec.kind),
        body: bodyFor(subscription, spec.kind),
        action: actionFor(spec.kind)
      });
    }
  }

  return plans.sort((a, b) => Date.parse(a.triggerAt) - Date.parse(b.triggerAt));
}

function titleFor(name: string, kind: RenewalReminderKind): string {
  if (kind === "seven_day") {
    return `${name} renews in 7 days`;
  }
  if (kind === "three_day") {
    return `${name} renews in 3 days`;
  }
  return `${name} renews today`;
}

function bodyFor(subscription: Subscription, kind: RenewalReminderKind): string {
  const amount = formatMoneyMinor(subscription.price.amountMinor, subscription.price.currency);
  if (kind === "three_day") {
    return `${amount} will be charged soon. Cancellation guide is ready.`;
  }
  if (kind === "day_of") {
    return `${amount} is due today. Was this expected?`;
  }
  return `${amount} is scheduled. Review it before the renewal window.`;
}

function actionFor(kind: RenewalReminderKind): RenewalReminderPlan["action"] {
  if (kind === "three_day") {
    return "cancel_now";
  }
  if (kind === "day_of") {
    return "confirm_charge";
  }
  return "view";
}

// `noLaterThan` bounds the shifted time (used for day-of reminders so quiet
// hours can never push the alert past the renewal instant). When present, the
// next-day wrap is suppressed and the result is clamped to the bound.
function applyQuietHours(
  trigger: Date,
  preference: ReminderPreferenceLookup[RenewalReminderKind],
  noLaterThan?: Date
): Date {
  if (!preference?.quietHoursStart || !preference.quietHoursEnd) {
    return trigger;
  }

  const start = parseHour(preference.quietHoursStart);
  const end = parseHour(preference.quietHoursEnd);
  if (start === null || end === null) {
    return trigger;
  }

  // Operate in UTC consistently — renewal dates are UTC ISO strings, so using
  // local getHours()/setHours() made reminder times depend on the server's
  // timezone (non-deterministic across environments).
  const hour = trigger.getUTCHours();
  const withinQuietHours = start < end
    ? hour >= start && hour < end
    : hour >= start || hour < end;

  if (!withinQuietHours) {
    return trigger;
  }

  const adjusted = new Date(trigger);
  adjusted.setUTCHours(end, 0, 0, 0);
  if (start > end && hour >= start) {
    // Late-night portion of a wrapping window (e.g. 22:00 with a 22:00–06:00
    // window) would shift to the NEXT day's window end. That is fine for an
    // early heads-up, but for a bounded (day-of) reminder it would land after
    // the renewal — so only wrap when unbounded.
    if (!noLaterThan) {
      adjusted.setUTCDate(adjusted.getUTCDate() + 1);
    }
  }
  if (noLaterThan && adjusted.getTime() > noLaterThan.getTime()) {
    return new Date(noLaterThan);
  }
  return adjusted;
}

function parseHour(value: string): number | null {
  const [hourText] = value.split(":");
  const hour = Number.parseInt(hourText ?? "", 10);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

export function formatMoneyMinor(amountMinor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amountMinor / 100);
}
