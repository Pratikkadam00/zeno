import * as LocalAuthentication from "expo-local-authentication";
import * as Linking from "expo-linking";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, Platform, Text, View, type AppStateStatus } from "react-native";
import { useAuthStore } from "../src/auth/authStore";
import { checkStatus, identifyRevenueCatUser, initRevenueCat, resetRevenueCatUser } from "../src/billing/revenueCat";
import { SubscriptionStoreProvider, useSubscriptionStore } from "../src/data/subscription-store";
import { cleanupNotificationHandlers, setupNotificationHandlers } from "../src/notifications/notificationHandlers";
import { registerForPushNotifications, rescheduleAllNotifications } from "../src/notifications/notificationService";
import { refreshWidgetSnapshot } from "../src/widgets/widgetBridge";
import { useZenoFonts } from "../src/theme/fonts";
import { ZenoThemeProvider, useZenoTheme } from "../src/theme/theme-provider";

// Hold the native splash until the Zeno typefaces are ready.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { loaded, error } = useZenoFonts();

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
    <ZenoThemeProvider>
      <SubscriptionStoreProvider>
        <RootStack />
      </SubscriptionStoreProvider>
    </ZenoThemeProvider>
  );
}

function RootStack() {
  const { theme, scheme } = useZenoTheme();
  const statusBarStyle = scheme === "dark" ? "light" : "dark";
  const { subscriptions, notificationSettings, quietHours, widgetSnapshot, hydrated, runCancellationVerification } = useSubscriptionStore();
  const segments = useSegments();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const biometricInFlight = useRef(false);
  const {
    status,
    isAuthenticated,
    accountId,
    hydrate,
    logout,
    setPlan,
    verifyMagicLink
  } = useAuthStore();
  const notificationSubscriptions = useMemo(() => subscriptions
    .filter((subscription) => subscription.status === "active" && subscription.nextRenewalDate)
    .map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      amount: subscription.price.amountMinor / 100,
      nextRenewalDate: subscription.nextRenewalDate ?? "",
      isTrial: subscription.billingCycle === "trial"
    })), [subscriptions]);

  const requireBiometricUnlock = useCallback(async () => {
    if (Platform.OS === "web" || biometricInFlight.current || !useAuthStore.getState().isAuthenticated) {
      return;
    }

    biometricInFlight.current = true;
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync()
      ]);

      if (!hasHardware || !isEnrolled) {
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Zeno",
        cancelLabel: "Lock",
        fallbackLabel: "Use device passcode",
        disableDeviceFallback: false
      });

      if (!result.success) {
        await logout();
        router.replace("/login");
      }
    } finally {
      biometricInFlight.current = false;
    }
  }, [logout]);

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
    // Anonymous → make sure RevenueCat isn't still bound to a previous account.
    if (!accountId) {
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
  }, [setPlan, accountId]);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) {
        return;
      }

      const parsed = Linking.parse(url);
      const token = readQueryParam(parsed.queryParams?.token);
      if (!token || !parsed.path?.includes("auth/verify")) {
        return;
      }

      await verifyMagicLink(token);
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

    if (!isAuthenticated && !onPublicRoute) {
      // Logged out on a protected screen → send to sign in.
      router.replace("/login");
      return;
    }

    if (isAuthenticated && onPublicRoute) {
      // Logged in but sitting on onboarding/login → go straight to the app.
      router.replace("/dashboard");
    }
  }, [isAuthenticated, segments, status]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void registerForPushNotifications();
    void requireBiometricUnlock();

    // Wait for the store to hydrate from SQLite before (re)scheduling, otherwise
    // we'd cancel all reminders and reschedule from seed data with the wrong
    // per-subscription settings during the launch window.
    if (hydrated) {
      void rescheduleAllNotifications(notificationSubscriptions, notificationSettings, quietHours);
      void refreshWidgetSnapshot(widgetSnapshot);
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = appState.current === "background" || appState.current === "inactive";
      appState.current = nextState;

      if (wasBackgrounded && nextState === "active" && useAuthStore.getState().isAuthenticated) {
        void requireBiometricUnlock();
        void rescheduleAllNotifications(notificationSubscriptions, notificationSettings, quietHours);
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, hydrated, notificationSubscriptions, notificationSettings, quietHours, widgetSnapshot, requireBiometricUnlock]);

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

  return (
    <>
      <StatusBar style={statusBarStyle} />
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
        {/* D3: Business / Public API / Partners are removed from consumer nav (kept
            as files for a future B2B tier). Backend / Open-Banking are dev-only and
            no longer linked from any consumer surface. */}
        <Stack.Screen name="backend" options={{ title: "Backend" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="paywall" options={{ title: "Upgrade" }} />
        <Stack.Screen name="subscription/add" options={{ title: "Add Subscription" }} />
        <Stack.Screen name="subscription/[id]" options={{ title: "Subscription" }} />
        <Stack.Screen name="subscription/cancel/[id]" options={{ title: "Cancel Subscription" }} />
      </Stack>
    </>
  );
}

function readQueryParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
