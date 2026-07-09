import type { BillingCycle } from "@zeno/shared";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { themes } from "../theme/tokens";
import { formatMoney } from "../utils/format";

// iOS silently caps pending local notifications at 64; schedule the nearest
// triggers only (with headroom) so distant reminders never crowd out imminent
// ones. Applied globally in rescheduleAllNotifications.
const MAX_SCHEDULED_NOTIFICATIONS = 55;

const pushTokenKey = "zeno_push_token";
const notificationChannelId = "zeno-renewals";
// Channels are created outside React (no hook available here), so the LED/accent
// color is sourced from the default theme's brand token instead of a magic hex.
const notificationAccentColor = themes.millennial.primary;

export type RenewalNotificationSubscription = {
  id: string;
  name: string;
  amount: number;
  /** Money.currency code (e.g. "USD", "INR"); defaults to "USD" if omitted. */
  currency?: string;
  nextRenewalDate: string;
  /** When true, nextRenewalDate is a free-trial conversion date → trial copy. */
  isTrial?: boolean;
  /** Weekly cadence collapses the reminder ladder to day-of only (see below). */
  billingCycle?: BillingCycle;
};

type BuiltTrigger = {
  subscriptionId: string;
  fireAt: Date;
  title: string;
  body: string;
  action: string;
};

export type RenewalNotificationPreferences = {
  sevenDay: boolean;
  threeDay: boolean;
  dayOf: boolean;
};

export type QuietHours = {
  enabled: boolean;
  startHour: number; // 0-23, local time
  endHour: number;   // 0-23, local time
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// If a trigger lands inside the user's quiet window, push it to the window's end
// (local wall-clock). Handles windows that wrap past midnight (e.g. 22:00-08:00).
export function shiftOutOfQuietHours(date: Date, quiet?: QuietHours): Date {
  if (!quiet?.enabled) {
    return date;
  }
  const { startHour: start, endHour: end } = quiet;
  if (start === end) {
    return date;
  }
  const hour = date.getHours();
  const inQuiet = start < end ? hour >= start && hour < end : hour >= start || hour < end;
  if (!inQuiet) {
    return date;
  }
  const adjusted = new Date(date);
  adjusted.setHours(end, 0, 0, 0);
  // Wrapping window and we're in the late-night portion → the end is tomorrow.
  if (start > end && hour >= start) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  return adjusted;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(notificationChannelId, {
      name: "Renewal reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: notificationAccentColor
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  const finalPermissions = existingPermissions.granted
    ? existingPermissions
    : await Notifications.requestPermissionsAsync();

  if (!finalPermissions.granted) {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResult.data;
  await SecureStore.setItemAsync(pushTokenKey, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });

  return token;
}

export async function scheduleRenewalNotifications(subscription: RenewalNotificationSubscription): Promise<void> {
  await scheduleRenewalNotificationsWithPreferences(subscription, {
    sevenDay: true,
    threeDay: true,
    dayOf: true
  });
}

export async function scheduleRenewalNotificationsWithPreferences(
  subscription: RenewalNotificationSubscription,
  preferences: RenewalNotificationPreferences,
  quietHours?: QuietHours
): Promise<void> {
  await cancelNotificationsForSubscription(subscription.id);

  for (const trigger of buildRenewalTriggers(subscription, preferences, quietHours)) {
    await scheduleTrigger(trigger);
  }
}

// Pure(ish) plan builder: resolves the reminder ladder for one subscription,
// applies quiet hours, drops past triggers, and returns the concrete triggers
// WITHOUT scheduling — so rescheduleAllNotifications can sort/cap across all
// subscriptions before hitting the (iOS-capped) native scheduler.
export function buildRenewalTriggers(
  subscription: RenewalNotificationSubscription,
  preferences: RenewalNotificationPreferences,
  quietHours?: QuietHours,
  now: number = Date.now()
): BuiltTrigger[] {
  const renewalDate = new Date(subscription.nextRenewalDate);
  if (Number.isNaN(renewalDate.getTime())) {
    return [];
  }

  const amount = formatAmount(subscription.amount, subscription.currency);
  // Free trials get earlier, sharper "cancel before you're charged" copy keyed
  // to the conversion date; paid subscriptions get the standard renewal radar.
  const notificationPlan = subscription.isTrial
    ? [
        {
          daysBefore: 2,
          title: `⚠️ ${subscription.name} free trial ends in 2 days`,
          body: `Cancel before you're charged ${amount}`,
          action: "cancel",
          enabled: preferences.sevenDay
        },
        {
          daysBefore: 1,
          title: `⏰ ${subscription.name} free trial ends tomorrow`,
          body: `Cancel now to avoid the ${amount} charge`,
          action: "cancel",
          enabled: preferences.threeDay
        },
        {
          daysBefore: 0,
          title: `${subscription.name} free trial ends today`,
          body: `${amount} will be charged unless you cancel`,
          action: "cancel",
          enabled: preferences.dayOf
        }
      ] as const
    : [
        {
          daysBefore: 7,
          title: `${subscription.name} renews in 7 days`,
          body: `${amount} · Tap to review`,
          action: "view",
          enabled: preferences.sevenDay
        },
        {
          daysBefore: 3,
          title: `⚠️ ${subscription.name} renews in 3 days`,
          body: `${amount} · Tap to cancel now`,
          action: "cancel",
          enabled: preferences.threeDay
        },
        {
          daysBefore: 0,
          title: `${subscription.name} charged today`,
          body: `${amount} was charged · Was this expected?`,
          action: "confirm",
          enabled: preferences.dayOf
        }
      ] as const;

  // Weekly subscriptions renew every 7 days, so 7-day and 3-day heads-ups fall
  // in the previous cycle and stack three overlapping reminders every week —
  // keep only the day-of for weekly cadence. Monthly+ keep the full ladder.
  const laddered = subscription.billingCycle === "weekly"
    ? notificationPlan.filter((plan) => plan.daysBefore === 0)
    : notificationPlan;

  const triggers: BuiltTrigger[] = [];
  for (const plan of laddered) {
    if (!plan.enabled) {
      continue;
    }

    // 9 AM in the device's LOCAL time on the renewal day — the intended slot.
    const baseTrigger = getNineAmTriggerDate(renewalDate, plan.daysBefore);
    let triggerDate = shiftOutOfQuietHours(baseTrigger, quietHours);
    // P1.5: a day-of reminder must fire ON the renewal day, never rolled to a
    // later day by a wrapping quiet window (that would land after the charge).
    // Compare LOCAL calendar days — not raw instants against the renewal, which
    // for a date-only (UTC-midnight) renewal is always numerically earlier than
    // 9 AM local and would wrongly drag the reminder to the previous evening.
    if (plan.daysBefore === 0 && !isSameLocalDay(triggerDate, baseTrigger)) {
      triggerDate = baseTrigger;
    }
    if (triggerDate.getTime() <= now) {
      continue;
    }

    triggers.push({
      subscriptionId: subscription.id,
      fireAt: triggerDate,
      title: plan.title,
      body: plan.body,
      action: plan.action
    });
  }
  return triggers;
}

async function scheduleTrigger(trigger: BuiltTrigger): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: trigger.title,
      body: trigger.body,
      data: {
        subscriptionId: trigger.subscriptionId,
        action: trigger.action
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger.fireAt,
      channelId: notificationChannelId
    }
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function cancelNotificationsForSubscription(subscriptionId: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduledNotifications
      .filter((notification) => notification.content.data?.subscriptionId === subscriptionId)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

export async function rescheduleAllNotifications(
  subscriptions: RenewalNotificationSubscription[],
  preferencesById: Record<string, RenewalNotificationPreferences> = {},
  quietHours?: QuietHours
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  // Build every candidate trigger across ALL subscriptions first, then keep the
  // soonest MAX_SCHEDULED_NOTIFICATIONS — otherwise, past ~21 subscriptions
  // (3 reminders each) later subs silently exhaust iOS's 64-slot budget and the
  // surviving ones are whichever happened to be processed first, not the
  // nearest. Sorting by fire date makes the imminent reminders win.
  const allTriggers = subscriptions.flatMap((subscription) => {
    const renewalTime = Date.parse(subscription.nextRenewalDate);
    if (Number.isNaN(renewalTime) || renewalTime <= now) {
      return [];
    }
    return buildRenewalTriggers(
      subscription,
      preferencesById[subscription.id] ?? { sevenDay: true, threeDay: true, dayOf: true },
      quietHours,
      now
    );
  });

  allTriggers.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  for (const trigger of allTriggers.slice(0, MAX_SCHEDULED_NOTIFICATIONS)) {
    await scheduleTrigger(trigger);
  }
}

export function getNineAmTriggerDate(renewalDate: Date, daysBefore: number): Date {
  // Renewal dates are stored as ISO (often date-only, i.e. UTC midnight). Read
  // the calendar day in UTC, then build 9 AM in the device's LOCAL timezone on
  // (renewal day − daysBefore) so the reminder fires at 9 AM the user's time on
  // the right date — not shifted a day by the UTC→local offset.
  const triggerDate = new Date(
    renewalDate.getUTCFullYear(),
    renewalDate.getUTCMonth(),
    renewalDate.getUTCDate() - daysBefore,
    9, 0, 0, 0
  );
  return triggerDate;
}

function formatAmount(amount: number, currency = "USD"): string {
  return formatMoney(Math.round(amount * 100), currency);
}
