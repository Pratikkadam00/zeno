import * as LocalAuthentication from "expo-local-authentication";
import * as Linking from "expo-linking";
import { router, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, Platform, Text, View, type AppStateStatus } from "react-native";
import { useAuthStore } from "../src/auth/authStore";
import { checkStatus, initRevenueCat } from "../src/billing/revenueCat";
import { SubscriptionStoreProvider, useSubscriptionStore } from "../src/data/subscription-store";
import { cleanupNotificationHandlers, setupNotificationHandlers } from "../src/notifications/notificationHandlers";
import { registerForPushNotifications, rescheduleAllNotifications } from "../src/notifications/notificationService";
import { SubRadarThemeProvider, useSubRadarTheme } from "../src/theme/theme-provider";

export default function RootLayout() {
  return (
    <SubRadarThemeProvider>
      <SubscriptionStoreProvider>
        <RootStack />
      </SubscriptionStoreProvider>
    </SubRadarThemeProvider>
  );
}

function RootStack() {
  const { theme } = useSubRadarTheme();
  const { subscriptions, notificationSettings } = useSubscriptionStore();
  const segments = useSegments();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const biometricInFlight = useRef(false);
  const {
    status,
    isAuthenticated,
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
      nextRenewalDate: subscription.nextRenewalDate ?? ""
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

  useEffect(() => {
    setupNotificationHandlers();
    return cleanupNotificationHandlers;
  }, []);

  useEffect(() => {
    void initRevenueCat()
      .then(() => checkStatus())
      .then(setPlan)
      .catch(() => setPlan("free"));
  }, [setPlan]);

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
    const isLoginRoute = topSegment === "login";

    if (!isAuthenticated && !isLoginRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isLoginRoute) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, segments, status]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void registerForPushNotifications();
    void rescheduleAllNotifications(notificationSubscriptions, notificationSettings);
    void requireBiometricUnlock();

    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = appState.current === "background" || appState.current === "inactive";
      appState.current = nextState;

      if (wasBackgrounded && nextState === "active" && useAuthStore.getState().isAuthenticated) {
        void requireBiometricUnlock();
        void rescheduleAllNotifications(notificationSubscriptions, notificationSettings);
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, notificationSubscriptions, notificationSettings, requireBiometricUnlock]);

  if (status === "loading") {
    return (
      <>
        <StatusBar style={theme.id === "millennial" ? "dark" : "light"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background, padding: 24 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Unlocking Zeno</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8, textAlign: "center" }}>Checking your secure session.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style={theme.id === "millennial" ? "dark" : "light"} />
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
        <Stack.Screen name="dashboard" options={{ title: "Zeno" }} />
        <Stack.Screen name="add" options={{ title: "Add Subscription" }} />
        <Stack.Screen name="calendar" options={{ title: "Renewal Calendar" }} />
        <Stack.Screen name="coach" options={{ title: "Spend Coach" }} />
        <Stack.Screen name="spend-twin" options={{ title: "Spend Twin" }} />
        <Stack.Screen name="family" options={{ title: "Family Vault" }} />
        <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
        <Stack.Screen name="open-banking" options={{ title: "Open Banking" }} />
        <Stack.Screen name="widgets" options={{ title: "Widgets" }} />
        <Stack.Screen name="business" options={{ title: "Business" }} />
        <Stack.Screen name="public-api" options={{ title: "Public API" }} />
        <Stack.Screen name="partners" options={{ title: "Partners" }} />
        <Stack.Screen name="backend" options={{ title: "Backend" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="paywall" options={{ title: "Upgrade" }} />
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
