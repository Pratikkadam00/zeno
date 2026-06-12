import { createRenewalReminderPlan, formatMoneyMinor, type NotificationPreference, type RenewalReminderKind, type RenewalReminderPlan, type Subscription } from "@subradar/shared";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function scheduleDayOfRenewal(subscription: Subscription, preference?: NotificationPreference): Promise<string | null> {
  if (preference && !preference.enabled) {
    return null;
  }
  if (!subscription.nextRenewalDate || subscription.status !== "active") {
    return null;
  }

  const triggerDate = new Date(subscription.nextRenewalDate);
  if (triggerDate.getTime() < Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${subscription.name} renews today`,
      body: `${formatMoney(subscription.price.amountMinor)} will be charged today.`,
      data: {
        subscriptionId: subscription.id,
        action: "view_subscription"
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate
    }
  });
}

export async function scheduleRenewalPlan(subscriptions: Subscription[]): Promise<Array<{ plan: RenewalReminderPlan; notificationId: string }>> {
  const plans = createRenewalReminderPlan(subscriptions);
  const scheduled: Array<{ plan: RenewalReminderPlan; notificationId: string }> = [];

  for (const plan of plans) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: plan.title,
        body: plan.body,
        data: {
          subscriptionId: plan.subscriptionId,
          action: plan.action,
          kind: plan.kind
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(plan.triggerAt)
      }
    });
    scheduled.push({ plan, notificationId });
  }

  return scheduled;
}

export function notificationLabel(kind: RenewalReminderKind): string {
  if (kind === "seven_day") {
    return "7-day";
  }
  if (kind === "three_day") {
    return "3-day cancel";
  }
  return "Day-of";
}

export function formatMoney(amountMinor: number, currency = "USD"): string {
  return formatMoneyMinor(amountMinor, currency);
}
