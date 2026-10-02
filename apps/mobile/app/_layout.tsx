import * as Linking from "expo-linking";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, Text, View, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppErrorBoundary } from "../src/components/AppErrorBoundary";
import { SplashSequence } from "../src/components/SplashSequence";
import { useAuthStore } from "../src/auth/authStore";
import { checkStatus, identifyRevenueCatUser, initRevenueCat, resetRevenueCatUser } from "../src/billing/revenueCat";
import { BudgetStoreProvider } from "../src/data/budget-store";
import { SubscriptionStoreProvider, useSubscriptionStore } from "../src/data/subscription-store";
import { cleanupNotificationHandlers, setupNotificationHandlers } from "../src/notifications/notificationHandlers";
import { registerForPushNotifications, rescheduleAllNotifications } from "../src/notifications/notificationService";
import { reminderSubscriptions } from "../src/notifications/reminder-subscriptions";
import { refreshWidgetSnapshot } from "../src/widgets/widgetBridge";
import { useZenoFonts } from "../src/theme/fonts";
import { HiddenWhileLocked } from "../src/security/HiddenWhileLocked";
import { LockOverlay } from "../src/security/LockOverlay";
import { useLockStore } from "../src/security/lock-store";
import { isAuthVerifyLink } from "../src/utils/deep-link";
import { ZenoThemeProvider, useZenoTheme } from "../src/theme/theme-provider";
import { initErrorReporting } from "../src/monitoring/report";

// Hold the native splash until the Zeno typefaces are ready.
void SplashScreen.preventAutoHideAsync().catch(() => {});

// As early as possible, before any component renders — inert without
// EXPO_PUBLIC_SENTRY_DSN (see src/monitoring/report.ts).
initErrorReporting();

export default function RootLayout() {
  const { loaded, error } = useZenoFonts();
  // The animated "Tear" splash plays once over the app on cold launch, then
  // dismisses itself. Its onDone is timer-driven, so it can never get stuck.
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  // Keep the splash up while fonts load; render once ready (or if loading failed,
  // fall back to system fonts rather than blocking the app).
  if (!loaded && !error) {
    return null;
  }

  return (
    // GestureHandlerRootView must wrap the whole app for react-native-gesture-handler
    // (and therefore @gorhom/bottom-sheet) to receive touches at all.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <ZenoThemeProvider>
          <SubscriptionStoreProvider>
            <BudgetStoreProvider>
              <RootStack />
            </BudgetStoreProvider>
          </SubscriptionStoreProvider>
        </ZenoThemeProvider>
        {/* Overlays the app (navy cover continues seamlessly from the native
            splash), tears away to the ledger page, then unmounts. */}
        {splashDone ? null : <SplashSequence onDone={() => setSplashDone(true)} />}
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { theme, scheme } = useZenoTheme();
  const statusBarStyle = scheme === "dark" ? "light" : "dark";
  const { subscriptions, notificationSettings, quietHours, remindersEnabled, widgetSnapshot, hydrated, runCancellationVerification } = useSubscriptionStore();
  const segments = useSegments();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const {
    status,
    isAuthenticated,
    accountId,
    hydrate,
    setPlan,
    verifyMagicLink
  } = useAuthStore();
  // Local-only users (no server account) are allowed into every device-local
  // screen — full CRUD, discovery, budgets, analytics, calendar, notifications,
  // export, delete all run on local SQLite regardless of auth. Only
  // server-dependent features (cloud sync, AI coach, Family Vault) stay gated
  // on isAuthenticated, unchanged.
  const canUseApp = isAuthenticated || status === "local_only";
  const lockEngaged = useLockStore((s) => s.locked);
  const lockReady = useLockStore((s) => s.ready);
  const hydrateLock = useLockStore((s) => s.hydrate);
  const lockNow = useLockStore((s) => s.lockNow);
  // F124: none at all while Settings' "Renewal reminders" switch is off.
  const notificationSubscriptions = useMemo(() => reminderSubscriptions(subscriptions, remindersEnabled), [subscriptions, remindersEnabled]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // CHANGE 4: once data is loaded, resolve any pending cancellations whose
  // verify-by date has passed (no charge detected → verified cancelled).
  useEffect(() => {
    if (hydrated) {
      runCancellationVerification();
    }
  }, [hydrated, runCancellationVerification]);

  useEffect(() => {
    setupNotificationHandlers();
    return cleanupNotificationHandlers;
  }, []);

  useEffect(() => {
    if (!accountId) {
      // Local-only: no Zeno account to bind RevenueCat to, but purchases must
      // still work — initialize RevenueCat (its own anonymous device id) and
      // read the plan from the local CustomerInfo. checkStatus() already falls
      // back to this client-side result whenever the server call 401s (no
      // Zeno auth token), so a local-only Pro/lifetime purchase is recognized.
      if (status === "local_only") {
        void initRevenueCat().then(() => checkStatus()).then(setPlan).catch(() => setPlan("free"));
        return;
      }
      // Logged out (on the login screen) → make sure RevenueCat isn't still
      // bound to a previous account.
      void resetRevenueCatUser();
      return;
    }
    // Bind RevenueCat to this account (so server-side entitlement lookups by the
    // auth-token account id match), then read the verified plan.
    void initRevenueCat()
      .then(() => identifyRevenueCatUser(accountId))
      .then(() => checkStatus())
      .then(setPlan)
      .catch(() => setPlan("free"));
  }, [setPlan, accountId, status]);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) {
        return;
      }

      const parsed = Linking.parse(url);
      const token = readQueryParam(parsed.queryParams?.token);
      // Match host+path segments: standalone parses zeno://auth/verify as
      // host "auth" / path "verify", so a path-only check silently fails in
      // production (works in Expo Go dev, which masked the break).
      if (!token || !isAuthVerifyLink(parsed.hostname, parsed.path)) {
        return;
      }

      // A refused or failed link (not requested here, expired, another account)
      // is shown by the auth store's `error` on the login screen; it must not
      // become an unhandled rejection or navigate anywhere.
      try {
        await verifyMagicLink(token);
      } catch {
        return;
      }
      router.replace("/dashboard");
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => subscription.remove();
  }, [verifyMagicLink]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const topSegment = segments[0];
    // Public routes are the onboarding screen ("/" → no segment) and login.
    const onPublicRoute = topSegment === undefined || topSegment === "login";

    if (!canUseApp && !onPublicRoute) {
      // Logged out (and not local-only) on a protected screen → send to sign in.
      router.replace("/login");
      return;
    }

    if (canUseApp && onPublicRoute) {
      // Already usable (real login or local-only) but sitting on onboarding/
      // login → go straight to the app.
      router.replace("/dashboard");
    }
  }, [canUseApp, segments, status]);

  // App-lifecycle setup, deliberately SEPARATE from the data effect below:
  // when this lived in one effect with data deps, every store mutation re-ran
  // hydrateLock() and threw the PIN overlay up after each add/edit/delete.
  // Keyed on canUseApp ONLY so it still re-runs on auth transitions — that is
  // what re-engages the lock after sign-out → continue-local-only (the PIN
  // bypass regression covered in lock-store.test.ts). hydrate() itself must
  // stay non-idempotent for the same reason.
  useEffect(() => {
    if (!canUseApp) {
      return;
    }
    void registerForPushNotifications();
    // Load the app-lock config; if a PIN is set this engages the lock overlay.
    void hydrateLock();
  }, [canUseApp, hydrateLock]);

  // Latest reschedule inputs mirrored into a ref so the AppState listener (below,
  // registered ONCE) can reconcile reminders on foreground from live values
  // without being re-registered on every data change.
  const rescheduleInputsRef = useRef({ notificationSubscriptions, notificationSettings, quietHours });
  useEffect(() => {
    rescheduleInputsRef.current = { notificationSubscriptions, notificationSettings, quietHours };
  }, [notificationSubscriptions, notificationSettings, quietHours]);

  // Debounced reminder reconcile (P4.1). Coalesce a burst of store recomputes in
  // one tick into a single trailing rescheduleAllNotifications, and depend ONLY on
  // the reminder-relevant inputs (never widgetSnapshot / app-lifecycle), so it no
  // longer re-fires on unrelated store changes. rescheduleAllNotifications diffs
  // against the pending queue, so a settled no-op does zero native writes. The
  // hydrated gate avoids scheduling from seed data during the launch window.
  useEffect(() => {
    if (!canUseApp || !hydrated) {
      return;
    }
    const timer = setTimeout(() => {
      void rescheduleAllNotifications(notificationSubscriptions, notificationSettings, quietHours);
    }, 500);
    return () => clearTimeout(timer);
  }, [canUseApp, hydrated, notificationSubscriptions, notificationSettings, quietHours]);

  // Push the home-screen/watch widget snapshot when its (now identity-stable)
  // content changes — separated from the reminder + lifecycle work.
  useEffect(() => {
    if (!canUseApp || !hydrated) {
      return;
    }
    void refreshWidgetSnapshot(widgetSnapshot);
  }, [canUseApp, hydrated, widgetSnapshot]);

  // App-lifecycle listener registered ONCE per auth state (keyed on canUseApp +
  // lockNow), never re-added on data churn. On background→active it re-engages
  // the lock and reconciles reminders from the live ref above.
  useEffect(() => {
    if (!canUseApp) {
      return;
    }
    const subscription = AppState.addEventListener("change", (nextState) => {
      const prevState = appState.current;
      const wasBackgrounded = prevState === "background" || prevState === "inactive";
      appState.current = nextState;

      const liveAuth = useAuthStore.getState();
      const liveCanUseApp = liveAuth.isAuthenticated || liveAuth.status === "local_only";
      // Engage the lock on the way OUT, not only on the way back in. The OS
      // snapshots the app for the switcher/recents as it leaves the foreground;
      // locking only on return meant that thumbnail showed the live ledger
      // (MASVS-PLATFORM-3). iOS reports "inactive" before "background" and takes
      // its snapshot after; covering on "inactive" is the only reliable point.
      // lockNow() is a no-op unless the user has enabled app-lock, and the
      // overlay defers its biometric prompt until the app is active again.
      if (prevState === "active" && (nextState === "inactive" || nextState === "background") && liveCanUseApp) {
        lockNow();
      }
      if (wasBackgrounded && nextState === "active" && liveCanUseApp) {
        // Re-engage the lock every time the app returns to the foreground.
        lockNow();
        const inputs = rescheduleInputsRef.current;
        void rescheduleAllNotifications(inputs.notificationSubscriptions, inputs.notificationSettings, inputs.quietHours);
      }
    });

    return () => subscription.remove();
  }, [canUseApp, lockNow]);

  if (status === "loading") {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background, padding: 24 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Unlocking Zeno</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8, textAlign: "center" }}>Checking your secure session.</Text>
        </View>
      </>
    );
  }

  // Fail-closed: cover the app whenever the lock could apply. Until the lock
  // store has hydrated (ready) we don't yet know if a PIN is set, so "not
  // ready" counts as locked, to avoid flashing financial data on cold launch.
  const covered = canUseApp && (!lockReady || lockEngaged);

  return (
    <>
      <StatusBar style={statusBarStyle} />
      {/* F105: while covered, the app is also hidden from accessibility services. */}
      <HiddenWhileLocked covered={covered}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: "800" },
            contentStyle: { backgroundColor: theme.background }
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="coach" options={{ title: "Spend Coach" }} />
          <Stack.Screen name="spend-twin" options={{ title: "Spend Twin" }} />
          <Stack.Screen name="family" options={{ title: "Family Vault" }} />
          <Stack.Screen name="open-banking" options={{ title: "Open Banking" }} />
          <Stack.Screen name="widgets" options={{ title: "Widgets" }} />
          <Stack.Screen name="wrapped" options={{ title: "Year in Review" }} />
          {/* D3: Business / Public API / Partners are removed from consumer nav (kept
              as files for a future B2B tier). Backend / Open-Banking are dev-only and
              no longer linked from any consumer surface. They stay reachable by
              deep link, so each still names its header (F156: without an entry
              the header showed the raw route name, "public-api"). */}
          <Stack.Screen name="business" options={{ title: "Business" }} />
          <Stack.Screen name="partners" options={{ title: "Partners" }} />
          <Stack.Screen name="public-api" options={{ title: "Public API" }} />
          <Stack.Screen name="backend" options={{ title: "Backend" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="profile" options={{ title: "Profile" }} />
          <Stack.Screen name="security" options={{ title: "Security" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
          <Stack.Screen name="budget" options={{ title: "Budget" }} />
          <Stack.Screen name="budget-recap" options={{ title: "Recap", presentation: "modal" }} />
          <Stack.Screen name="paywall" options={{ title: "Upgrade" }} />
          <Stack.Screen name="subscription/add" options={{ title: "Add Subscription" }} />
          <Stack.Screen name="subscription/[id]" options={{ title: "Subscription" }} />
          <Stack.Screen name="subscription/cancel/[id]" options={{ title: "Cancel Subscription" }} />
        </Stack>
      </HiddenWhileLocked>
      {/* F159: the cover is its own window. A plain View sat on top of the
          activity only, so a Modal (the subscription menu, the notes and
          Discover editors) or an Alert left open when the app locked stayed
          above it and kept working: Pause ran on a locked app (seen on the
          emulator). A Modal opened last is the topmost window and takes every
          touch; Back can't dismiss it. */}
      {covered ? (
        <Modal visible transparent={false} animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
          <LockOverlay />
        </Modal>
      ) : null}
    </>
  );
}

function readQueryParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
