import type { CurrencyCode } from "@zeno/shared";
import { useMemo, useState, type ComponentType } from "react";
import { deleteAccountOnServer } from "../src/api/client";
import { useAuthStore } from "../src/auth/authStore";
import { useBudgetStore } from "../src/data/budget-store";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useLockStore } from "../src/security/lock-store";
import { spacing } from "../src/theme/spacing";
import { type as typography } from "../src/theme/typography";
import { fonts, palette } from "../src/theme/zeno";
import { currencySymbol } from "../src/utils/format";
import { router } from "expo-router";
import {
  Banknote,
  Bell,
  CreditCard,
  Clock,
  Download,
  FileText,
  Gauge,
  Gift,
  HelpCircle,
  LogOut,
  MailSearch,
  MessageSquare,
  Moon,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  User,
  Users
} from "lucide-react-native";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ServiceAvatar } from "../src/components/zeno";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";
import { withAlpha } from "../src/utils/subscription-ui";

const APP_STORE_REVIEW_URL = "https://apps.apple.com/";
const TERMS_URL = "https://zeno.app/legal/terms";
const PRIVACY_URL = "https://zeno.app/legal/privacy";
const FEEDBACK_EMAIL = "mailto:feedback@zeno.app";
const SHARE_URL = "https://zeno.app";
const APP_VERSION = "1.0.0";

type UserPlan = "free" | "pro" | "family";
type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type SettingsRow = {
  id: string;
  Icon: IconCmp;
  iconBg: string;
  label: string;
  sub?: string;
  value?: string;
  chevron?: boolean;
  isSwitch?: boolean;
  switchValue?: boolean;
  danger?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
};

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

export default function SettingsScreen() {
  const { theme, scheme, toggleScheme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { plan, accountId, status, logout } = useAuthStore((state) => ({
    plan: state.plan,
    accountId: state.accountId,
    status: state.status,
    logout: state.logout
  }));
  const isLocalOnly = status === "local_only";
  const { subscriptions, clearAllData, quietHours, setQuietHours, homeCurrency, setHomeCurrency, exchangeRatesAvailable } = useSubscriptionStore();
  const { reset: resetBudget } = useBudgetStore();
  const lockEnabled = useLockStore((s) => s.enabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const quietWindowLabel = `${formatHour(quietHours.startHour)} – ${formatHour(quietHours.endHour)}`;
  const QUIET_PRESETS: Array<{ label: string; startHour: number; endHour: number }> = [
    { label: "10 PM – 8 AM", startHour: 22, endHour: 8 },
    { label: "11 PM – 7 AM", startHour: 23, endHour: 7 },
    { label: "9 PM – 9 AM", startHour: 21, endHour: 9 },
    { label: "Midnight – 9 AM", startHour: 0, endHour: 9 }
  ];

  const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];
  const homeCurrencyLabel = `${homeCurrency} (${currencySymbol(homeCurrency)})`;

  const userEmail = isLocalOnly ? "Local-only mode" : accountId ?? "you@example.com";
  const userPlan = (plan ?? "free") as UserPlan;
  const planLabel = userPlan === "pro" ? "Pro" : userPlan === "family" ? "Family" : "Free plan";

  function exportData() {
    // CHANGE 8: your data is yours — one-tap CSV export of everything tracked.
    const header = "name,amount,currency,billingCycle,nextRenewalDate,status,category";
    const rows = subscriptions.map((s) =>
      [
        `"${s.name.replace(/"/g, '""')}"`,
        (s.price.amountMinor / 100).toFixed(2),
        s.price.currency,
        s.billingCycle,
        s.nextRenewalDate ?? "",
        s.status,
        s.category
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    void Share.share({ message: csv, title: "Zeno subscriptions export" });
  }

  function confirmDelete() {
    Alert.alert("Delete all data", "This will permanently remove all subscription records from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { resetBudget(); void clearAllData().then(() => router.replace("/dashboard")); } }
    ]);
  }

  // Deletes the account server-side FIRST (purges cloud sync, entitlement cache,
  // Plaid item, household membership, and revokes sessions) and only wipes local
  // data + signs out once the server confirms it. If the server call fails, the
  // account is NOT touched locally — proceeding anyway would tell the user their
  // account is gone while server-side data still exists. A local-only user has
  // no server account to delete (the settings UI hides this action for them;
  // this guard is defense-in-depth against calling it some other way).
  async function cancelAccount() {
    if (!isLocalOnly) {
      const serverDeleted = await deleteAccountOnServer();
      if (!serverDeleted) {
        Alert.alert(
          "Couldn't delete your account",
          "We couldn't reach the server to confirm deletion. Check your connection and try again — nothing was changed."
        );
        return;
      }
    }
    resetBudget();
    await clearAllData();
    logout();
  }

  function confirmCancelAccount() {
    Alert.alert(
      "Cancel my Zeno account",
      "This permanently deletes your account and data from our servers, erases everything from this device, and signs you out. This cannot be undone.",
      [
        { text: "Keep my account", style: "cancel" },
        { text: "Cancel account", style: "destructive", onPress: () => void cancelAccount() }
      ]
    );
  }

  const sections: Array<{ title: string; rows: SettingsRow[] }> = [
    {
      title: "Account",
      rows: [
        { id: "profile", Icon: User, iconBg: palette.category.blue, label: "Profile", value: userEmail.length > 22 ? `${userEmail.slice(0, 19)}...` : userEmail, chevron: true, onPress: () => router.push("/profile" as never) },
        { id: "plan", Icon: CreditCard, iconBg: palette.category.violet, label: "Plan & billing", value: planLabel, chevron: true, onPress: () => router.push("/paywall") },
        { id: "security", Icon: ShieldCheck, iconBg: palette.category.green, label: "Security", sub: "App lock · Face ID + PIN", value: lockEnabled ? "On" : "Off", chevron: true, onPress: () => router.push("/security" as never) }
      ]
    },
    {
      title: "App",
      rows: [
        { id: "dark", Icon: Moon, iconBg: palette.ink[700], label: "Dark mode", isSwitch: true, switchValue: scheme === "dark", onToggle: () => toggleScheme() },
        {
          id: "home-currency", Icon: Banknote, iconBg: palette.category.green, label: "Home currency",
          sub: exchangeRatesAvailable
            ? "Totals across currencies are converted"
            : "Conversion rates unavailable — totals show your dominant currency only",
          value: homeCurrencyLabel, chevron: true,
          onPress: () => Alert.alert("Home currency", "Totals and budgets are shown in this currency. Individual subscriptions keep displaying in the currency you added them in.", [
            ...CURRENCY_OPTIONS.map((code) => ({ text: `${code} (${currencySymbol(code)})`, onPress: () => setHomeCurrency(code) })),
            { text: "Cancel", style: "cancel" as const }
          ])
        }
      ]
    },
    {
      title: "Household & tools",
      rows: [
        { id: "family", Icon: Users, iconBg: palette.category.coral, label: "Family Vault", sub: "Share a combined spend view", chevron: true, onPress: () => router.push("/family" as never) },
        { id: "spend-twin", Icon: Gauge, iconBg: palette.category.blue, label: "Spend Twin", sub: "See how your spend compares", chevron: true, onPress: () => router.push("/spend-twin" as never) },
        { id: "widgets", Icon: Sparkles, iconBg: palette.category.violet, label: "Widgets & Watch", sub: "Preview — home screen setup coming soon", chevron: true, onPress: () => router.push("/widgets" as never) },
        { id: "wrapped", Icon: Gift, iconBg: palette.category.amber, label: "Year in Review", sub: "Your Zeno Wrapped", chevron: true, onPress: () => router.push("/wrapped" as never) }
      ]
    },
    {
      title: "Notifications",
      rows: [
        { id: "notifications", Icon: Bell, iconBg: palette.category.coral, label: "Push notifications", isSwitch: true, switchValue: notificationsEnabled, onToggle: setNotificationsEnabled },
        { id: "quiet-hours", Icon: MoonStar, iconBg: palette.category.violet, label: "Quiet hours", sub: quietHours.enabled ? `${quietWindowLabel} · reminders shift to morning` : "Off", isSwitch: true, switchValue: quietHours.enabled, onToggle: (value) => setQuietHours({ enabled: value }) },
        {
          id: "quiet-window", Icon: Clock, iconBg: palette.category.slate, label: "Quiet window", value: quietWindowLabel, chevron: true,
          onPress: () => Alert.alert("Quiet window", "Renewal reminders that fall inside this window are delayed to the end of it.", [
            ...QUIET_PRESETS.map((preset) => ({ text: preset.label, onPress: () => setQuietHours({ startHour: preset.startHour, endHour: preset.endHour, enabled: true }) })),
            { text: "Cancel", style: "cancel" as const }
          ])
        }
      ]
    },
    {
      title: "Data & privacy",
      rows: [
        { id: "connected", Icon: MailSearch, iconBg: palette.category.blue, label: "Connected inboxes", value: "None connected", chevron: true, onPress: () => router.push("/discover") },
        { id: "export", Icon: Download, iconBg: palette.category.slate, label: "Export my data", sub: "Download everything as CSV", chevron: true, onPress: exportData },
        { id: "delete", Icon: Trash2, iconBg: palette.semantic.danger, label: "Delete all my data", sub: "Erase everything from this device", chevron: true, onPress: confirmDelete }
      ]
    },
    {
      title: "More",
      rows: [
        { id: "rate", Icon: Star, iconBg: palette.category.amber, label: "Rate Zeno", chevron: true, onPress: () => void Linking.openURL(APP_STORE_REVIEW_URL) },
        { id: "feedback", Icon: HelpCircle, iconBg: palette.category.teal, label: "Help & feedback", chevron: true, onPress: () => void Linking.openURL(FEEDBACK_EMAIL) },
        { id: "share", Icon: MessageSquare, iconBg: palette.category.pink, label: "Share with friends", chevron: true, onPress: () => void Share.share({ url: SHARE_URL, message: SHARE_URL }) },
        { id: "privacy", Icon: FileText, iconBg: palette.ink[700], label: "Privacy Policy", chevron: true, onPress: () => void Linking.openURL(PRIVACY_URL) },
        { id: "terms", Icon: FileText, iconBg: palette.ink[700], label: "Terms of Service", chevron: true, onPress: () => void Linking.openURL(TERMS_URL) }
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.pageHeader}>Settings</Text>

        {/* Profile */}
        <View style={styles.profileBlock}>
          <View style={styles.profileCard}>
            <ServiceAvatar name={userEmail} size={52} shape="circle" color={palette.category.teal} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>{userEmail}</Text>
              <Text style={styles.planText}>{planLabel}</Text>
            </View>
            {userPlan === "free" ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Go Pro" style={styles.goProBtn} onPress={() => router.push("/paywall")}>
                <Text style={styles.goProText}>Go Pro</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Privacy reassurance (CHANGE 8) */}
        <View style={styles.privacyNote}>
          <ShieldCheck size={17} color={theme.success} strokeWidth={2} />
          <Text style={styles.privacyNoteText}>
            Your financial data is encrypted on this device. We never see your bank login or your data.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, index) => {
                const isLast = index === section.rows.length - 1;
                const inner = (
                  <View style={styles.row}>
                    <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]} accessible={false} importantForAccessibility="no-hide-descendants">
                      <row.Icon size={17} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={[styles.rowTitle, row.danger ? { color: theme.danger } : undefined]} numberOfLines={1}>{row.label}</Text>
                      {row.sub ? <Text style={styles.rowSub}>{row.sub}</Text> : null}
                    </View>
                    {row.isSwitch ? (
                      <Switch
                        accessibilityRole="switch"
                        accessibilityLabel={row.label}
                        value={row.switchValue ?? false}
                        onValueChange={(value) => row.onToggle?.(value)}
                        trackColor={{ false: theme.surfaceAlt, true: theme.success }}
                        thumbColor={theme.onPrimary}
                      />
                    ) : null}
                    {!row.isSwitch && row.value ? (
                      <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
                    ) : null}
                    {row.chevron && !row.isSwitch ? <Text style={styles.rowChevron} accessible={false}>›</Text> : null}
                    {!isLast ? <View style={styles.separator} /> : null}
                  </View>
                );
                if (row.isSwitch || !row.onPress) {
                  return <View key={row.id}>{inner}</View>;
                }
                return (
                  <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={row.label} onPress={row.onPress}>
                    {inner}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Easy exit (CHANGE 8) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOutCard}
          onPress={() => {
            if (isLocalOnly) {
              Alert.alert(
                "Exit local-only mode",
                "This won't delete your data. You'll return to the welcome screen, where you can sign in or continue locally again.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Exit", style: "destructive", onPress: () => void logout() }
                ]
              );
              return;
            }
            Alert.alert("Sign out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign out", style: "destructive", onPress: () => void logout() }
            ]);
          }}
        >
          <View style={styles.signOutIconWrap} accessible={false} importantForAccessibility="no-hide-descendants">
            <LogOut size={17} color={theme.text} strokeWidth={2} />
          </View>
          <Text style={styles.signOutText}>{isLocalOnly ? "Exit local-only mode" : "Sign out"}</Text>
        </Pressable>

        {/* No server account exists in local-only mode — "Delete all my data"
            above already covers the local-only equivalent of this action. */}
        {!isLocalOnly ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel my Zeno account" style={styles.cancelAccountBtn} onPress={confirmCancelAccount}>
            <Text style={styles.cancelAccountText}>Cancel my Zeno account</Text>
          </Pressable>
        ) : null}

        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Zeno · Version {APP_VERSION}</Text>
          <Text style={styles.versionSub}>Made with care for people who hate surprise charges.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { paddingBottom: 100, backgroundColor: theme.background },
    pageHeader: { paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4, color: theme.text, fontSize: 30, fontFamily: fonts.display.bold, letterSpacing: -0.6 },

    profileBlock: { paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4 },
    profileCard: { backgroundColor: theme.card, borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
    profileInfo: { flex: 1, minWidth: 0 },
    profileName: { fontSize: 17, fontFamily: fonts.sans.semibold, letterSpacing: -0.3, color: theme.text },
    planText: { ...typography.caption1, color: theme.mutedText, marginTop: 3 },
    goProBtn: { backgroundColor: theme.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
    goProText: { fontSize: 13, fontFamily: fonts.sans.semibold, color: theme.onPrimary },

    privacyNote: { marginHorizontal: spacing.screenH, marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: theme.successSurface, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 },
    privacyNoteText: { flex: 1, fontSize: 12.5, fontFamily: fonts.sans.regular, color: theme.mutedText, lineHeight: 18 },

    sectionLabel: { ...typography.sectionHeader, color: theme.mutedText, paddingHorizontal: spacing.screenH, paddingTop: 20, paddingBottom: 8 },
    sectionCard: { marginHorizontal: spacing.screenH, backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },
    row: { position: "relative", minHeight: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    rowTextWrap: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 16, fontFamily: fonts.sans.regular, color: theme.text, letterSpacing: -0.2 },
    rowSub: { ...typography.caption1, color: theme.mutedText, marginTop: 2 },
    rowValue: { ...typography.subheadline, color: theme.mutedText, maxWidth: 140, textAlign: "right" },
    rowChevron: { color: theme.quietText, fontSize: 18, marginLeft: 2 },
    separator: { position: "absolute", left: 60, right: 0, bottom: 0, height: 0.5, backgroundColor: theme.border },

    signOutCard: { marginHorizontal: spacing.screenH, marginTop: 18, backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 14 },
    signOutIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" },
    signOutText: { fontSize: 16, fontFamily: fonts.sans.semibold, color: theme.text, letterSpacing: -0.2 },

    cancelAccountBtn: { alignItems: "center", paddingVertical: 16, marginTop: 4 },
    cancelAccountText: { fontSize: 14, fontFamily: fonts.sans.semibold, color: theme.danger },

    versionSection: { paddingTop: 16, paddingBottom: 24, alignItems: "center" },
    versionText: { ...typography.caption2, color: theme.quietText },
    versionSub: { ...typography.caption1, color: theme.quietText, textAlign: "center", marginTop: 4, lineHeight: 18 }
  });
}
