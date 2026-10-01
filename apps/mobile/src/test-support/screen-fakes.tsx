/**
 * The module FAKES for the jest screen tests (P3.8). Kept apart from
 * screen-harness.tsx on purpose: a jest.mock factory requires this file, and it
 * must not import any app module (the harness imports the real providers, which
 * import the very modules being mocked, a cycle).
 */
import type { Subscription } from "@zeno/shared";
import { useEffect, type ReactElement } from "react";

export const fakeStorage = {
  meta: new Map<string, string>(),
  rows: new Map<string, Subscription>(),
  openFails: false
};

export const fakeDatabaseModule = {
  openZenoDatabase: jest.fn(async () => {
    if (fakeStorage.openFails) throw new Error("fake: database unavailable");
    return { name: "fake-db" };
  }),
  readAppMeta: jest.fn(async (_db: unknown, key: string) => fakeStorage.meta.get(key) ?? null),
  writeAppMeta: jest.fn(async (_db: unknown, key: string, value: string) => {
    fakeStorage.meta.set(key, value);
  })
};

export const fakeRepositoryModule = {
  listSubscriptions: jest.fn(async () => [...fakeStorage.rows.values()].filter((s) => !s.deletedAt)),
  upsertSubscription: jest.fn(async (_db: unknown, s: Subscription) => {
    fakeStorage.rows.set(s.id, s);
  }),
  softDeleteSubscription: jest.fn(async (_db: unknown, id: string) => {
    fakeStorage.rows.delete(id);
  }),
  clearAllSubscriptions: jest.fn(async () => {
    fakeStorage.rows.clear();
  })
};

export const fakeFxModule = {
  fetchLatestRates: jest.fn(async () => null),
  isRateTableStale: jest.fn(() => false)
};

export const fakeNotificationsModule = {
  cancelAllNotifications: jest.fn(async () => {}),
  cancelNotificationsForSubscription: jest.fn(async () => {}),
  scheduleRenewalNotificationsWithPreferences: jest.fn(async () => {}),
  scheduleRenewalNotifications: jest.fn(async () => {}),
  rescheduleAllNotifications: jest.fn(),
  registerForPushNotifications: jest.fn(async () => ({ status: "granted" })),
  clearStoredPushToken: jest.fn(async () => {}),
  // The REAL list (pure: no native call), resolved when called so this file
  // still imports no app code: a screen must list what the scheduler keeps.
  upcomingReminders: (...args: unknown[]) =>
    (jest.requireActual("../notifications/notificationService") as { upcomingReminders: (...a: unknown[]) => unknown }).upcomingReminders(...args)
};

export const routerMock = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true)
};
export const routeParams: { current: Record<string, unknown> } = { current: {} };

export const fakeExpoRouterModule = {
  router: routerMock,
  useRouter: () => routerMock,
  useLocalSearchParams: () => routeParams.current,
  useGlobalSearchParams: () => routeParams.current,
  usePathname: () => "/",
  useSegments: () => [],
  Stack: { Screen: function StackScreen() { return null; } },
  Link: function Link({ children }: { children: ReactElement }) { return children; },
  // Runs the focus effect once on mount, like the screen gaining focus.
  useFocusEffect: (effect: () => void | (() => void)) => {
    useEffect(effect, [effect]);
  }
};

/** Reset every fake. `seeded: false` = first launch (the store writes the seed);
 *  `rows` = what the database already holds (implies seeded). */
export function resetFakes({ rows }: { rows?: Subscription[] } = {}): void {
  fakeStorage.meta.clear();
  fakeStorage.rows.clear();
  fakeStorage.openFails = false;
  if (rows) {
    fakeStorage.meta.set("subscriptions.seeded.v1", "2026-01-01T00:00:00.000Z");
    for (const row of rows) fakeStorage.rows.set(row.id, row);
  }
  for (const mod of [fakeDatabaseModule, fakeRepositoryModule, fakeFxModule, fakeNotificationsModule, routerMock]) {
    for (const fn of Object.values(mod)) (fn as jest.Mock).mockClear?.();
  }
  routeParams.current = {};
}
