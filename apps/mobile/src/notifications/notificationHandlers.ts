import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import type { EventSubscription } from "expo-notifications";

let responseSubscription: EventSubscription | null = null;

// A tap's `data` is untrusted input (§8: validate deep-link params). Today every
// notification is the app's own local reminder (no push token exists since
// 2026-10-09, U6.23), but a notification's data is read as if it came from
// anywhere, and the id is spliced into a route path. Only ids shaped like
// the app's own (`sub_<uuid>`, seed ids such as `sub_netflix`) are accepted, so
// "/", "?", "#", "%" or ".." can never re-target the navigation. The 128 cap
// matches the shared schema's entity-id bound.
const SUBSCRIPTION_ID = /^[A-Za-z0-9_-]{1,128}$/;

function readSubscriptionId(value: unknown): string | null {
  return typeof value === "string" && SUBSCRIPTION_ID.test(value) ? value : null;
}

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
    const subscriptionId = readSubscriptionId(data?.subscriptionId);
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
