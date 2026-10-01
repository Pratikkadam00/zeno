import type { CurrencyCode } from "@zeno/shared";
import { useMemo, useState, type ComponentType } from "react";
import { useShallow } from "zustand/react/shallow";
import { deleteAccountOnServer } from "../src/api/client";
import { useConnectedInboxesLabel } from "../src/discovery/connected-inboxes";
import { getFeedbackMailto, getLegalUrls, getSiteUrl } from "../src/config/site";
import { openExternalUrl } from "../src/utils/external-link";
import { useAuthStore } from "../src/auth/authStore";
import { useBudgetStore } from "../src/data/budget-store";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { eraseDeviceData, type EraseScope } from "../src/security/erase-device";
import { useLockStore } from "../src/security/lock-store";
import { spacing } from "../src/theme/spacing";
import { type as typography } from "../src/theme/typography";
import { fonts, palette } from "../src/theme/zeno";
import { csvSafeCell } from "../src/utils/csv-export";
import { currencySymbol } from "../src/utils/format";
import Constants from "expo-constants";
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
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LedgerSheet, SectionHead, ServiceAvatar } from "../src/components/zeno";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";

const APP_STORE_REVIEW_URL = "https://apps.apple.com/";
const TERMS_URL = getLegalUrls().terms;
const PRIVACY_URL = getLegalUrls().privacy;
const FEEDBACK_EMAIL = getFeedbackMailto();
const SHARE_URL = getSiteUrl();
// F126: the build's own version (app.config.ts), not a hard-coded "1.0.0".
const APP_VERSION = Constants.expoConfig?.version ?? "unknown";

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
  const { theme, scheme, toggleScheme, resetPreferences } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { plan, email, status, logout } = useAuthStore(
    useShallow((state) => ({
      plan: state.plan,
      email: state.email,
      status: state.status,
      logout: state.logout
    }))
  );
  const isLocalOnly = status === "local_only";
  const { subscriptions, clearAllData, quietHours, setQuietHours, remindersEnabled, setRemindersEnabled, homeCurrency, setHomeCurrency, exchangeRatesAvailable, coachAiConsent, setCoachAiConsent } = useSubscriptionStore();
  const { reset: resetBudget } = useBudgetStore();
  const lockEnabled = useLockStore((s) => s.enabled);
  const disableAppLock = useLockStore((s) => s.disable);
  // P4 debt closed: the option pickers are designed LedgerSheets, not system
  // Alert dialogs (which can't show the current value, can't be styled, and on
  // Android render a cramped stack of buttons).
  const [picker, setPicker] = useState<null | "currency" | "quiet">(null);
  const connectedInboxes = useConnectedInboxesLabel();

  const quietWindowLabel = `${formatHour(quietHours.startHour)} – ${formatHour(quietHours.endHour)}`;
  const QUIET_PRESETS: { label: string; startHour: number; endHour: number }[] = [
    { label: "10 PM – 8 AM", startHour: 22, endHour: 8 },
    { label: "11 PM – 7 AM", startHour: 23, endHour: 7 },
    { label: "9 PM – 9 AM", startHour: 21, endHour: 9 },
    { label: "Midnight – 9 AM", startHour: 0, endHour: 9 }
  ];

  const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];
  const homeCurrencyLabel = `${homeCurrency} (${currencySymbol(homeCurrency)})`;

  // F125: the signed-in email, never the account id or a made-up address.
  const userEmail = isLocalOnly ? "Local-only mode" : email ?? "Signed in";
  const userPlan = (plan ?? "free") as UserPlan;
  const planLabel = userPlan === "pro" ? "Pro" : userPlan === "family" ? "Family" : "Free plan";

  function exportData() {
    // CHANGE 8: your data is yours — one-tap CSV export of everything tracked.
    // F127: the user's notes are their data too; they were left out.
    const header = "name,amount,currency,billingCycle,nextRenewalDate,status,category,notes";
    const rows = subscriptions.map((s) =>
      [
        csvSafeCell(s.name),
        (s.price.amountMinor / 100).toFixed(2),
        s.price.currency,
        s.billingCycle,
        s.nextRenewalDate ?? "",
        s.status,
        s.category,
        s.notes ? csvSafeCell(s.notes) : ""
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    void Share.share({ message: csv, title: "Zeno subscriptions export" });
  }

  // Both wipes go through one tested function (src/security/erase-device.ts,
  // finding F27) that runs every step even when one fails and reports what could
  // not be erased, so neither flow claims a wipe that did not fully happen.
  function eraseDevice(scope: EraseScope) {
    return eraseDeviceData(scope, {
      clearSubscriptionData: clearAllData,
      resetBudget,
      disableAppLock,
      resetAppearance: resetPreferences
    });
  }

  async function deleteAllData() {
    const { failed } = await eraseDevice("data");
    router.replace("/dashboard");
    if (failed.length > 0) {
      Alert.alert("Some data couldn't be erased", `These are still on this device: ${failed.join(", ")}. Please try again.`);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete all data",
      "This permanently removes your subscriptions, budgets, price history, reminder settings and connected Gmail inboxes from this device. Your app lock and appearance stay as they are.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void deleteAllData() }
      ]
    );
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
    const { failed } = await eraseDevice("account");
    await logout();
    if (failed.length > 0) {
      Alert.alert(
        "Account deleted",
        `Your account was deleted and you're signed out, but these couldn't be removed from this device: ${failed.join(", ")}.`
      );
    }
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

  const sections: { title: string; rows: SettingsRow[] }[] = [
    {
      title: "Account",
      rows: [
        { id: "profile", Icon: User, iconBg: palette.category.blue, label: "Profile", value: userEmail.length > 22 ? `${userEmail.slice(0, 19)}...` : userEmail, chevron: true, onPress: () => router.push("/profile" as never) },
        { id: "plan", Icon: CreditCard, iconBg: palette.category.violet, label: "Plan & billing", value: planLabel, chevron: true, onPress: () => router.push("/paywall") },
        { id: "security", Icon: ShieldCheck, iconBg: palette.category.green, label: "Security", sub: "App lock · PIN + biometrics", value: lockEnabled ? "On" : "Off", chevron: true, onPress: () => router.push("/security" as never) }
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
          onPress: () => setPicker("currency")
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
        // F124: was "Push notifications", a switch held in this screen's state
        // that changed nothing. Now the design's master switch for reminders.
        { id: "notifications", Icon: Bell, iconBg: palette.category.coral, label: "Renewal reminders", sub: "7D · 3D · DAY OF", isSwitch: true, switchValue: remindersEnabled, onToggle: setRemindersEnabled },
        { id: "quiet-hours", Icon: MoonStar, iconBg: palette.category.violet, label: "Quiet hours", sub: quietHours.enabled ? `${quietWindowLabel} · reminders shift to morning` : "Off", isSwitch: true, switchValue: quietHours.enabled, onToggle: (value) => setQuietHours({ enabled: value }) },
        {
          id: "quiet-window", Icon: Clock, iconBg: palette.category.slate, label: "Quiet window", value: quietWindowLabel, chevron: true,
          onPress: () => setPicker("quiet")
        }
      ]
    },
    {
      title: "Data & privacy",
      rows: [
        {
          id: "ai-coach-consent", Icon: Sparkles, iconBg: palette.category.violet, label: "AI coaching",
          sub: coachAiConsent === "granted"
            ? "On · subscription names & amounts sent to the AI model"
            : "Off · insights stay on your device",
          isSwitch: true, switchValue: coachAiConsent === "granted",
          onToggle: (value: boolean) => setCoachAiConsent(value ? "granted" : "declined")
        },
        { id: "connected", Icon: MailSearch, iconBg: palette.category.blue, label: "Connected inboxes", value: connectedInboxes, chevron: true, onPress: () => router.push("/discover") },
        { id: "export", Icon: Download, iconBg: palette.category.slate, label: "Export my data", sub: "Your subscriptions and notes, as CSV", chevron: true, onPress: exportData },
        { id: "delete", Icon: Trash2, iconBg: palette.semantic.danger, label: "Delete all my data", sub: "Erase all your data from this device", chevron: true, onPress: confirmDelete }
      ]
    },
    {
      title: "More",
      rows: [
        { id: "rate", Icon: Star, iconBg: palette.category.amber, label: "Rate Zeno", chevron: true, onPress: () => void openExternalUrl(APP_STORE_REVIEW_URL) },
        { id: "feedback", Icon: HelpCircle, iconBg: palette.category.teal, label: "Help & feedback", chevron: true, onPress: () => void openExternalUrl(FEEDBACK_EMAIL) },
        { id: "share", Icon: MessageSquare, iconBg: palette.category.pink, label: "Share with friends", chevron: true, onPress: () => void Share.share({ url: SHARE_URL, message: SHARE_URL }) },
        { id: "privacy", Icon: FileText, iconBg: palette.ink[700], label: "Privacy Policy", chevron: true, onPress: () => void openExternalUrl(PRIVACY_URL) },
        { id: "terms", Icon: FileText, iconBg: palette.ink[700], label: "Terms of Service", chevron: true, onPress: () => void openExternalUrl(TERMS_URL) }
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
          <Text style={styles.privacyNoteText}>
            Your subscriptions are encrypted on this device. We never ask for your bank login, and nothing is shared unless you turn on a cloud feature.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title}>
            <SectionHead>{section.title}</SectionHead>
            <View style={styles.sectionCard}>
              {section.rows.map((row, index) => {
                const isLast = index === section.rows.length - 1;
                const inner = (
                  <View style={styles.row}>
                    <View style={styles.rowIcon} accessible={false} importantForAccessibility="no-hide-descendants">
                      <row.Icon size={18} color={row.danger ? theme.stampAlert : theme.mutedText} strokeWidth={2} />
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

      {/* Designed option pickers (replacing Alert.alert). Each shows the
          CURRENT value with a check — something a system alert can't do. */}
      <LedgerSheet
        open={picker === "currency"}
        title="Home currency"
        destructive="Totals and budgets are shown in this currency. Individual subscriptions keep displaying in the currency you added them in."
        options={CURRENCY_OPTIONS.map((code) => ({
          value: code,
          label: `${code} (${currencySymbol(code)})`,
          selected: code === homeCurrency
        }))}
        onPick={(value) => {
          setHomeCurrency(value as CurrencyCode);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />

      <LedgerSheet
        open={picker === "quiet"}
        title="Quiet window"
        destructive="Renewal reminders that fall inside this window are delayed to the end of it."
        options={QUIET_PRESETS.map((preset) => ({
          value: `${preset.startHour}-${preset.endHour}`,
          label: preset.label,
          selected: quietHours.startHour === preset.startHour && quietHours.endHour === preset.endHour
        }))}
        onPick={(value) => {
          const [start, end] = value.split("-").map(Number);
          if (start !== undefined && end !== undefined) {
            setQuietHours({ startHour: start, endHour: end, enabled: true });
          }
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { paddingBottom: 100, backgroundColor: theme.background },
    pageHeader: { paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4, color: theme.text, fontSize: 30, fontFamily: fonts.display.bold, letterSpacing: -0.6 },

    profileBlock: { paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4 },
    profileCard: { marginHorizontal: spacing.screenH, paddingBottom: 14, borderBottomWidth: 1, borderColor: theme.ruleStrong, flexDirection: "row", alignItems: "center", gap: 12 },
    profileInfo: { flex: 1, minWidth: 0 },
    profileName: { fontSize: 17, fontFamily: fonts.sans.semibold, letterSpacing: -0.3, color: theme.text },
    planText: { ...typography.caption1, color: theme.mutedText, marginTop: 3 },
    goProBtn: { borderWidth: 1, borderColor: theme.ruleStrong, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    goProText: { fontSize: 13, fontFamily: fonts.sans.semibold, color: theme.text },

    privacyNote: { marginHorizontal: spacing.screenH, marginTop: 16, paddingLeft: 14, paddingVertical: 2, borderLeftWidth: 3, borderLeftColor: theme.primary },
    privacyNoteText: { fontSize: 14, fontFamily: fonts.sans.regular, color: theme.text, lineHeight: 21 },
    sectionCard: { paddingHorizontal: spacing.screenH },
    row: { position: "relative", minHeight: 48, flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12 },
    rowIcon: { width: 18, alignItems: "center", flexShrink: 0 },
    rowTextWrap: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 14.5, fontFamily: fonts.sans.semibold, color: theme.text, letterSpacing: -0.1 },
    rowSub: { fontFamily: fonts.mono.regular, fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", color: theme.quietText, marginTop: 3 },
    rowValue: { ...typography.subheadline, color: theme.mutedText, maxWidth: 140, textAlign: "right" },
    rowChevron: { color: theme.quietText, fontSize: 18, marginLeft: 2 },
    separator: { position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: theme.rule },

    signOutCard: { marginHorizontal: spacing.screenH, marginTop: 8, paddingVertical: 13, borderBottomWidth: 1, borderColor: theme.rule, flexDirection: "row", alignItems: "center", gap: 12 },
    signOutIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" },
    signOutText: { fontSize: 16, fontFamily: fonts.sans.semibold, color: theme.text, letterSpacing: -0.2 },

    cancelAccountBtn: { alignItems: "center", paddingVertical: 16, marginTop: 4 },
    cancelAccountText: { fontSize: 14, fontFamily: fonts.sans.semibold, color: theme.danger },

    versionSection: { paddingTop: 16, paddingBottom: 24, alignItems: "center" },
    versionText: { ...typography.caption2, color: theme.quietText },
    versionSub: { ...typography.caption1, color: theme.quietText, textAlign: "center", marginTop: 4, lineHeight: 18 }
  });
}
