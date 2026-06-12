import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import type { EventSubscription } from "expo-notifications";

let responseSubscription: EventSubscription | null = null;

export function setupNotificationHandlers(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true
    })
  });

  responseSubscription?.remove();
  responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const subscriptionId = typeof data?.subscriptionId === "string" ? data.subscriptionId : null;
    const action = typeof data?.action === "string" ? data.action : null;

    if (action === "cancel" && subscriptionId) {
      router.push(`/subscription/cancel/${subscriptionId}` as never);
      return;
    }

    if (action === "view" && subscriptionId) {
      router.push(`/subscription/${subscriptionId}` as never);
      return;
    }

    if (action === "confirm") {
      router.push("/dashboard");
    }
  });
}

export function cleanupNotificationHandlers(): void {
  responseSubscription?.remove();
  responseSubscription = null;
}
