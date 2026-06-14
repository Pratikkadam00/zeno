import type { Subscription } from "../domain";

export type EndingTrial = {
  subscription: Subscription;
  /** Whole-day countdown to conversion. 0 = converts today. */
  daysUntilEnd: number;
  endsAt: string;
};

const DAY_MS = 86_400_000;

function toUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Free-trial guardian core.
 *
 * A free trial is modelled as a subscription on the "trial" billing cycle whose
 * `nextRenewalDate` is the date it converts to a paid charge. This returns the
 * active (not cancelled/paused) trials converting within `withinDays`, soonest
 * first, each with a whole-day countdown (0 = converts today). Already-converted
 * trials (countdown < 0) are excluded.
 */
export function getEndingTrials(subscriptions: Subscription[], now: Date = new Date(), withinDays = 30): EndingTrial[] {
  const today = toUtcDay(now.getTime());
  const trials: EndingTrial[] = [];

  for (const subscription of subscriptions) {
    if (subscription.billingCycle !== "trial") continue;
    if (subscription.status === "cancelled" || subscription.status === "paused") continue;
    if (!subscription.nextRenewalDate) continue;

    const end = Date.parse(subscription.nextRenewalDate);
    if (Number.isNaN(end)) continue;

    const daysUntilEnd = Math.round((toUtcDay(end) - today) / DAY_MS);
    if (daysUntilEnd < 0 || daysUntilEnd > withinDays) continue;

    trials.push({ subscription, daysUntilEnd, endsAt: subscription.nextRenewalDate });
  }

  return trials.sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
}
