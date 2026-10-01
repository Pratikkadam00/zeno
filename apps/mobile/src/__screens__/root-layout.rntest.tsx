import type { Subscription } from "@zeno/shared";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootLayout from "../../app/_layout";
import { fakeNotificationsModule, fakeStorage, resetFakes } from "../test-support/screen-fakes";

/**
 * P3.8f-3: the root layout (app/_layout.tsx): fonts and splash, the auth
 * gate's routing, the magic-link deep link, RevenueCat identity, the app lock
 * cover, reminder scheduling (F124's switch reaches the scheduler here), the
 * widget, cancellation verification and the app-state listener. The
 * subscription and budget stores and the cover are real; native modules and
 * stores with their own suites are faked.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => {
  const { View } = jest.requireActual("react-native");
  const fakes = jest.requireActual("../test-support/screen-fakes");
  const segments: { current: string[] } = { current: [] };
  function Stack({ children }: { children: unknown }) { return <View testID="stack">{children as never}</View>; }
  Stack.Screen = function StackScreen() { return null; };
  return { router: fakes.routerMock, Stack, useSegments: () => segments.current, segments };
});
jest.mock("expo-linking", () => {
  const listeners: ((e: { url: string }) => void)[] = [];
  return {
    listeners,
    initial: { url: null as string | null },
    // A custom-scheme URL parses the way expo-linking reports it: zeno://auth/verify
    // has host "auth" and path "verify".
    parse: (url: string) => {
      const u = new URL(url);
      const queryParams: Record<string, string | string[]> = {};
      for (const key of new Set(u.searchParams.keys())) {
        const all = u.searchParams.getAll(key);
        queryParams[key] = all.length > 1 ? all : all[0]!;
      }
      return { hostname: u.hostname || null, path: u.pathname.replace(/^\/+/, "") || null, queryParams };
    },
    getInitialURL: jest.fn(async function (this: unknown) {
      return (jest.requireMock("expo-linking") as { initial: { url: string | null } }).initial.url;
    }),
    addEventListener: jest.fn((_type: string, cb: (e: { url: string }) => void) => {
      listeners.push(cb);
      return { remove: jest.fn(() => listeners.splice(listeners.indexOf(cb), 1)) };
    })
  };
});
// The gesture root needs the native module; this test drives no gestures.
jest.mock("react-native-gesture-handler", () => {
  const { View } = jest.requireActual("react-native");
  return { GestureHandlerRootView: View };
});
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn(async () => {}), hideAsync: jest.fn(async () => {}) }));
jest.mock("../theme/fonts", () => ({ useZenoFonts: jest.fn(() => ({ loaded: true, error: null })) }));
jest.mock("../components/SplashSequence", () => ({
  SplashSequence: ({ onDone }: { onDone: () => void }) => {
    const { Pressable: P, Text: T } = jest.requireActual("react-native");
    return <P accessibilityRole="button" accessibilityLabel="Finish splash" onPress={onDone}><T>SPLASH</T></P>;
  }
}));
jest.mock("../security/LockOverlay", () => ({
  LockOverlay: () => { const { Text: T } = jest.requireActual("react-native"); return <T>LOCK OVERLAY</T>; }
}));
jest.mock("../monitoring/report", () => ({ initErrorReporting: jest.fn() }));
jest.mock("../notifications/notificationHandlers", () => ({ setupNotificationHandlers: jest.fn(), cleanupNotificationHandlers: jest.fn() }));
jest.mock("../widgets/widgetBridge", () => ({ refreshWidgetSnapshot: jest.fn(async () => {}), clearWidgetSnapshot: jest.fn(async () => {}) }));
jest.mock("../billing/revenueCat", () => ({
  initRevenueCat: jest.fn(async () => true),
  identifyRevenueCatUser: jest.fn(async () => {}),
  checkStatus: jest.fn(async () => "pro"),
  resetRevenueCatUser: jest.fn(async () => {})
}));
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({})) };
});
jest.mock("../security/lock-store", () => {
  const { create } = jest.requireActual("zustand");
  return { useLockStore: create(() => ({})) };
});

/* eslint-disable @typescript-eslint/no-require-imports */
const routerModule = require("expo-router") as { router: Record<string, jest.Mock>; segments: { current: string[] } };
const linking = require("expo-linking") as { initial: { url: string | null }; listeners: ((e: { url: string }) => void)[]; getInitialURL: jest.Mock };
const splash = require("expo-splash-screen") as { hideAsync: jest.Mock };
const fonts = require("../theme/fonts") as { useZenoFonts: jest.Mock };
const handlers = require("../notifications/notificationHandlers") as Record<string, jest.Mock>;
const widget = require("../widgets/widgetBridge") as { refreshWidgetSnapshot: jest.Mock };
const rc = require("../billing/revenueCat") as Record<string, jest.Mock>;
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void; getState: () => Record<string, jest.Mock> } };
const { useLockStore } = require("../security/lock-store") as { useLockStore: { setState: (s: object) => void; getState: () => Record<string, jest.Mock> } };
/* eslint-enable @typescript-eslint/no-require-imports */

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "gym", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Gym", category: "health",
  price: { amountMinor: 4000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(20),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});

// The app-state listener the layout registers, and the state it starts from.
let appStateHandler: ((s: AppStateStatus) => void) | null = null;
const removeAppState = jest.fn();
jest.spyOn(AppState, "addEventListener").mockImplementation((_t, cb) => {
  appStateHandler = cb as (s: AppStateStatus) => void;
  return { remove: removeAppState } as never;
});

function auth(over: object) {
  useAuthStore.setState({
    status: "authenticated", isAuthenticated: true, accountId: "acct_1",
    hydrate: jest.fn(async () => {}), setPlan: jest.fn(), verifyMagicLink: jest.fn(async () => {}), ...over
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes({ rows: [sub({})] });
  routerModule.segments.current = ["(tabs)"];
  linking.initial.url = null;
  linking.listeners.length = 0;
  fonts.useZenoFonts.mockReturnValue({ loaded: true, error: null });
  for (const m of [splash.hideAsync, handlers.setupNotificationHandlers!, handlers.cleanupNotificationHandlers!, widget.refreshWidgetSnapshot, removeAppState]) m.mockClear();
  for (const m of Object.values(rc)) m.mockClear();
  rc.checkStatus!.mockResolvedValue("pro");
  fakeNotificationsModule.rescheduleAllNotifications.mockClear();
  fakeNotificationsModule.registerForPushNotifications.mockClear();
  appStateHandler = null;
  // The app starts in the foreground, as a device reports it (jest-expo mocks
  // currentState as a function, not the string a device gives).
  Object.defineProperty(AppState, "currentState", { value: "active", configurable: true, writable: true });
  auth({});
  useLockStore.setState({ locked: false, ready: true, hydrate: jest.fn(async () => {}), lockNow: jest.fn() });
});
afterEach(() => jest.useRealTimers());

async function mount() {
  const r = render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><RootLayout /></SafeAreaProvider>);
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  return r;
}
/** Whether the app (the Stack) is hidden from accessibility services, read off
 *  the nearest host View that sets it (HiddenWhileLocked). */
type TreeNode = { props: Record<string, unknown>; parent: TreeNode | null };
function appHidden(): boolean | undefined {
  let node: TreeNode | null = screen.getByTestId("stack", { includeHiddenElements: true }) as unknown as TreeNode;
  while (node && node.props.accessibilityElementsHidden === undefined) node = node.parent;
  return node?.props.accessibilityElementsHidden as boolean | undefined;
}
const settle = async (ms: number) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };
const appGoes = async (next: AppStateStatus) => { await act(async () => { appStateHandler!(next); }); };

describe("root layout, start-up", () => {
  it("holds everything (and the native splash) while fonts load", async () => {
    fonts.useZenoFonts.mockReturnValue({ loaded: false, error: null });
    await mount();
    expect(screen.queryByTestId("stack")).toBeNull();
    expect(splash.hideAsync).not.toHaveBeenCalled();
  });

  it.each([
    ["fonts loaded", { loaded: true, error: null }],
    ["fonts failed (system fonts instead, never stuck)", { loaded: false, error: new Error("font") }]
  ])("%s: hides the native splash and renders the app; the animated splash dismisses itself", async (_n, state) => {
    fonts.useZenoFonts.mockReturnValue(state);
    await mount();
    expect(splash.hideAsync).toHaveBeenCalled();
    expect(screen.getByTestId("stack")).toBeTruthy();
    expect(screen.getByText("SPLASH")).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByRole("button", { name: "Finish splash" })); });
    expect(screen.queryByText("SPLASH")).toBeNull();
  });

  it("while the session is being read: a holding screen, no routing", async () => {
    auth({ status: "loading", isAuthenticated: false, accountId: null });
    await mount();
    expect(screen.getByText("Unlocking Zeno")).toBeTruthy();
    expect(useAuthStore.getState().hydrate).toHaveBeenCalledTimes(1);
    expect(routerModule.router.replace).not.toHaveBeenCalled();
  });

  it("notification handlers are set up, and removed on unmount with the app-state listener", async () => {
    const r = await mount();
    expect(handlers.setupNotificationHandlers).toHaveBeenCalledTimes(1);
    r.unmount();
    expect(handlers.cleanupNotificationHandlers).toHaveBeenCalledTimes(1);
    expect(removeAppState).toHaveBeenCalled();
  });
});

describe("root layout, the auth gate", () => {
  it.each([
    ["signed out, on a protected screen → sign in", { status: "anonymous", isAuthenticated: false, accountId: null }, ["(tabs)"], "/login"],
    ["signed in, on sign-in → the ledger", {}, ["login"], "/dashboard"],
    ["signed in, on onboarding → the ledger", {}, [], "/dashboard"],
    ["local-only, on onboarding → the ledger", { status: "local_only", isAuthenticated: false, accountId: null }, [], "/dashboard"]
  ])("%s", async (_n, state, segments, target) => {
    auth(state);
    routerModule.segments.current = segments;
    await mount();
    expect(routerModule.router.replace).toHaveBeenCalledWith(target);
  });

  it.each([
    ["signed out on onboarding", { status: "anonymous", isAuthenticated: false, accountId: null }, []],
    ["signed out on sign-in", { status: "anonymous", isAuthenticated: false, accountId: null }, ["login"]],
    ["signed in on a protected screen", {}, ["(tabs)"]]
  ])("%s: stays", async (_n, state, segments) => {
    auth(state);
    routerModule.segments.current = segments;
    await mount();
    expect(routerModule.router.replace).not.toHaveBeenCalled();
  });
});

describe("root layout, the magic link", () => {
  it("a sign-in link that opened the app is verified, then the ledger opens", async () => {
    linking.initial.url = "zeno://auth/verify?token=abc123";
    await mount();
    expect(useAuthStore.getState().verifyMagicLink).toHaveBeenCalledWith("abc123");
    expect(routerModule.router.replace).toHaveBeenCalledWith("/dashboard");
  });

  it("a link arriving while open is handled too; a repeated token param uses the first", async () => {
    await mount();
    await act(async () => { linking.listeners[0]!({ url: "zeno://auth/verify?token=t1&token=t2" }); });
    expect(useAuthStore.getState().verifyMagicLink).toHaveBeenCalledWith("t1");
  });

  it.each([
    ["another screen's link", "zeno://subscription/abc?token=x"],
    ["a sign-in link without a token", "zeno://auth/verify"]
  ])("%s is not treated as sign-in", async (_n, url) => {
    linking.initial.url = url;
    await mount();
    expect(useAuthStore.getState().verifyMagicLink).not.toHaveBeenCalled();
  });

  it("a refused link stays on screen (the store shows why): no navigation, no unhandled rejection", async () => {
    auth({ status: "anonymous", isAuthenticated: false, accountId: null, verifyMagicLink: jest.fn(async () => { throw new Error("That sign-in link has expired."); }) });
    routerModule.segments.current = ["login"];
    linking.initial.url = "zeno://auth/verify?token=old";
    await mount();
    expect(useAuthStore.getState().verifyMagicLink).toHaveBeenCalledWith("old");
    expect(routerModule.router.replace).not.toHaveBeenCalled();
  });
});

describe("root layout, billing identity", () => {
  it("signed in: RevenueCat is bound to the account, then the verified plan is read", async () => {
    await mount();
    expect(rc.identifyRevenueCatUser).toHaveBeenCalledWith("acct_1");
    expect(useAuthStore.getState().setPlan).toHaveBeenCalledWith("pro");
  });

  it("local-only: RevenueCat's own anonymous id, the plan read from it, no account bound", async () => {
    auth({ status: "local_only", isAuthenticated: false, accountId: null });
    await mount();
    expect(rc.initRevenueCat).toHaveBeenCalled();
    expect(rc.identifyRevenueCatUser).not.toHaveBeenCalled();
    expect(useAuthStore.getState().setPlan).toHaveBeenCalledWith("pro");
  });

  it.each([
    ["signed in", {}],
    ["local-only", { status: "local_only", isAuthenticated: false, accountId: null }]
  ])("%s: a billing failure means the free plan, never a crash", async (_n, state) => {
    rc.checkStatus!.mockRejectedValue(new Error("store down"));
    auth(state);
    await mount();
    expect(useAuthStore.getState().setPlan).toHaveBeenCalledWith("free");
  });

  it("signed out: RevenueCat is reset so the next account doesn't inherit purchases", async () => {
    auth({ status: "anonymous", isAuthenticated: false, accountId: null });
    await mount();
    expect(rc.resetRevenueCatUser).toHaveBeenCalled();
    expect(useAuthStore.getState().setPlan).not.toHaveBeenCalled();
  });
});

describe("root layout, the app lock", () => {
  it("until the lock has loaded, the app is covered and hidden from screen readers (fail-closed)", async () => {
    useLockStore.setState({ ready: false });
    await mount();
    expect(screen.getByText("LOCK OVERLAY")).toBeTruthy();
    expect(appHidden()).toBe(true);
    expect(useLockStore.getState().hydrate).toHaveBeenCalledTimes(1);
    expect(fakeNotificationsModule.registerForPushNotifications).toHaveBeenCalledTimes(1);
  });

  it("locked: covered; loaded and unlocked: the app, readable", async () => {
    useLockStore.setState({ locked: true });
    await mount();
    expect(screen.getByText("LOCK OVERLAY")).toBeTruthy();
    await act(async () => { useLockStore.setState({ locked: false }); });
    expect(screen.queryByText("LOCK OVERLAY")).toBeNull();
    expect(appHidden()).toBe(false);
  });

  it("signed out: no cover, no lock loaded, no push registration", async () => {
    auth({ status: "anonymous", isAuthenticated: false, accountId: null });
    useLockStore.setState({ ready: false });
    await mount();
    expect(screen.queryByText("LOCK OVERLAY")).toBeNull();
    expect(useLockStore.getState().hydrate).not.toHaveBeenCalled();
    expect(fakeNotificationsModule.registerForPushNotifications).not.toHaveBeenCalled();
  });
});

describe("root layout, data work once storage has loaded", () => {
  it("reminders are reconciled once, half a second after the data settles", async () => {
    await mount();
    expect(fakeNotificationsModule.rescheduleAllNotifications).not.toHaveBeenCalled();
    await settle(600);
    expect(fakeNotificationsModule.rescheduleAllNotifications).toHaveBeenCalledTimes(1);
    const [subs, settings] = fakeNotificationsModule.rescheduleAllNotifications.mock.calls[0]!;
    expect(subs).toEqual([expect.objectContaining({ id: "gym", name: "Gym", amount: 40 })]);
    expect(settings).toHaveProperty("gym");
  });

  it("F124: with Settings' reminders switch off, the scheduler gets nothing (every reminder cancelled)", async () => {
    fakeStorage.meta.set("notification.enabled.v1", "false");
    await mount();
    await settle(600);
    expect(fakeNotificationsModule.rescheduleAllNotifications).toHaveBeenLastCalledWith([], expect.anything(), expect.anything());
  });

  it("the widget gets the snapshot", async () => {
    await mount();
    expect(widget.refreshWidgetSnapshot).toHaveBeenCalledWith(expect.objectContaining({ activeCount: 1 }));
  });

  it("a pending cancellation past its check date is resolved (no charge → cancelled)", async () => {
    resetFakes({ rows: [sub({ status: "pending", cancellationRequestedAt: iso(-40), cancellationVerifyBy: iso(-1) })] });
    await mount();
    expect(fakeStorage.rows.get("gym")?.status).toBe("cancelled");
  });

  it("signed out: nothing is scheduled and the widget isn't touched", async () => {
    auth({ status: "anonymous", isAuthenticated: false, accountId: null });
    await mount();
    await settle(600);
    expect(fakeNotificationsModule.rescheduleAllNotifications).not.toHaveBeenCalled();
    expect(widget.refreshWidgetSnapshot).not.toHaveBeenCalled();
  });
});

describe("root layout, leaving and returning to the app", () => {
  it("locks on the way OUT (before the app-switcher snapshot), and again on return, then reconciles reminders", async () => {
    await mount();
    await settle(600);
    fakeNotificationsModule.rescheduleAllNotifications.mockClear();
    await appGoes("inactive");
    expect(useLockStore.getState().lockNow).toHaveBeenCalledTimes(1);
    await appGoes("background");
    expect(useLockStore.getState().lockNow).toHaveBeenCalledTimes(1);
    await appGoes("active");
    expect(useLockStore.getState().lockNow).toHaveBeenCalledTimes(2);
    expect(fakeNotificationsModule.rescheduleAllNotifications).toHaveBeenCalledTimes(1);
  });

  it("straight to background also locks", async () => {
    await mount();
    await appGoes("background");
    expect(useLockStore.getState().lockNow).toHaveBeenCalledTimes(1);
  });

  it("signed out meanwhile (live state): no lock, no reconcile", async () => {
    await mount();
    await settle(600);
    fakeNotificationsModule.rescheduleAllNotifications.mockClear();
    // The listener reads the live auth state, so an event racing the sign-out
    // (before the effect's cleanup removes it) still neither locks nor schedules.
    await act(async () => { useAuthStore.setState({ status: "anonymous", isAuthenticated: false }); });
    await appGoes("background");
    await appGoes("active");
    expect(useLockStore.getState().lockNow).not.toHaveBeenCalled();
    expect(fakeNotificationsModule.rescheduleAllNotifications).not.toHaveBeenCalled();
  });

  it("signed out: no listener at all", async () => {
    auth({ status: "anonymous", isAuthenticated: false, accountId: null });
    await mount();
    expect(appStateHandler).toBeNull();
  });
});
