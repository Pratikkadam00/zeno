import type { Subscription } from "@zeno/shared";
import type { RenewalNotificationSubscription } from "./notificationService";

/**
 * What the root layout hands to `rescheduleAllNotifications`: every active
 * subscription with a renewal date, or NONE when Settings' "Renewal reminders"
 * switch is off (F124). Reconciling against an empty list cancels every
 * pending reminder, so turning the switch off takes effect at once.
 */
export function reminderSubscriptions(subscriptions: Subscription[], remindersEnabled: boolean): RenewalNotificationSubscription[] {
  if (!remindersEnabled) return [];
  return subscriptions.flatMap((subscription) =>
    subscription.status === "active" && subscription.nextRenewalDate
      ? [{
          id: subscription.id,
          name: subscription.name,
          amount: subscription.price.amountMinor / 100,
          currency: subscription.price.currency,
          nextRenewalDate: subscription.nextRenewalDate,
          isTrial: subscription.billingCycle === "trial",
          billingCycle: subscription.billingCycle
        }]
      : []
  );
}
