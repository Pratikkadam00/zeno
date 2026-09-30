import { disconnectAllGmailAccounts } from "../discovery/emailScanner";
import { clearStoredPushToken } from "../notifications/notificationService";
import { clearWidgetSnapshot } from "../widgets/widgetBridge";
import { clearThemePreference } from "./secure-store";

/**
 * Erasing this device's copy of the user's data (finding F27). Settings offers
 * two wipes, and each one's promise must be literally true:
 *
 *  - "data": "Delete all my data". The user stays signed in and keeps their app
 *    lock and appearance. Every record and every connection is removed.
 *  - "account": "Cancel my Zeno account", run only after the server confirmed
 *    the deletion. Everything in "data", plus the app lock PIN, appearance and
 *    the stored push token. The caller then signs out, which clears the session
 *    tokens and the local-only flag.
 *
 * Kept on purpose (none of it is the user's data): the SQLCipher database and
 * its key (the rows inside are deleted, and the empty database is reused), the
 * "demo data already seeded" flag (otherwise the demo subscriptions would come
 * back on the next launch), and the cached public exchange-rate table.
 *
 * Every step runs even if an earlier one fails, and the report names what could
 * not be erased, so the UI never claims a wipe that did not happen.
 */
export type EraseScope = "data" | "account";

/** The erase actions owned by React providers and stores; the screen passes them in. */
export type StoreEraseActions = {
  clearSubscriptionData: () => Promise<void>;
  resetBudget: () => Promise<void>;
  disableAppLock: () => Promise<void>;
  resetAppearance: () => Promise<void>;
};

export type EraseStep = { label: string; run: () => Promise<void> };
export type EraseReport = { failed: string[] };

export function eraseSteps(scope: EraseScope, actions: StoreEraseActions): EraseStep[] {
  const data: EraseStep[] = [
    // First: revoking at Google needs the network, and a slow revoke must not
    // hold back the local wipe of anything else (each step is independent).
    { label: "connected Gmail inboxes", run: disconnectAllGmailAccounts },
    { label: "subscriptions, price history and reminder settings", run: actions.clearSubscriptionData },
    { label: "budgets", run: actions.resetBudget },
    { label: "home-screen widget", run: clearWidgetSnapshot }
  ];
  if (scope === "data") {
    return data;
  }
  return [
    ...data,
    { label: "app lock PIN", run: actions.disableAppLock },
    { label: "appearance settings", run: actions.resetAppearance },
    { label: "appearance setting from an older version", run: clearThemePreference },
    { label: "notification token", run: clearStoredPushToken }
  ];
}

export async function runEraseSteps(steps: EraseStep[]): Promise<EraseReport> {
  const failed: string[] = [];
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      console.warn(`Erase step failed: ${step.label}.`, error);
      failed.push(step.label);
    }
  }
  return { failed };
}

export function eraseDeviceData(scope: EraseScope, actions: StoreEraseActions): Promise<EraseReport> {
  return runEraseSteps(eraseSteps(scope, actions));
}
