import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const pushTokenKey = "zeno_push_token";
const notificationChannelId = "zeno-renewals";

export type RenewalNotificationSubscription = {
  id: string;
  name: string;
  amount: number;
  nextRenewalDate: string;
};

export type RenewalNotificationPreferences = {
  sevenDay: boolean;
  threeDay: boolean;
  dayOf: boolean;
};

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(notificationChannelId, {
      name: "Renewal reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB"
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
  preferences: RenewalNotificationPreferences
): Promise<void> {
  await cancelNotificationsForSubscription(subscription.id);

  const renewalDate = new Date(subscription.nextRenewalDate);
  if (Number.isNaN(renewalDate.getTime())) {
    return;
  }

  const amount = formatAmount(subscription.amount);
  const notificationPlan = [
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

  for (const plan of notificationPlan) {
    if (!plan.enabled) {
      continue;
    }

    const triggerDate = getNineAmTriggerDate(renewalDate, plan.daysBefore);
    if (triggerDate.getTime() <= Date.now()) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: plan.title,
        body: plan.body,
        data: {
          subscriptionId: subscription.id,
          action: plan.action
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: notificationChannelId
      }
    });
  }
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
  preferencesById: Record<string, RenewalNotificationPreferences> = {}
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  for (const subscription of subscriptions) {
    const renewalTime = Date.parse(subscription.nextRenewalDate);
    if (Number.isNaN(renewalTime) || renewalTime <= now) {
      continue;
    }

    await scheduleRenewalNotificationsWithPreferences(
      subscription,
      preferencesById[subscription.id] ?? { sevenDay: true, threeDay: true, dayOf: true }
    );
  }
}

function getNineAmTriggerDate(renewalDate: Date, daysBefore: number): Date {
  const triggerDate = new Date(renewalDate);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);
  triggerDate.setHours(9, 0, 0, 0);
  return triggerDate;
}

function formatAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
