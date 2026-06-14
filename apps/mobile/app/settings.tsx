import { useMemo, useState } from "react";
import { useAuthStore } from "../src/auth/authStore";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { spacing } from "../src/theme/spacing";
import { type as typography } from "../src/theme/typography";
import { router } from "expo-router";
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
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";
import { withAlpha } from "../src/utils/subscription-ui";

const APP_STORE_REVIEW_URL = "https://apps.apple.com/";
const TERMS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";
const FEEDBACK_EMAIL = "mailto:feedback@zeno.app";
const SHARE_URL = "https://example.com/zeno";
const APP_VERSION = "1.0.0";

type UserPlan = "free" | "pro" | "family";
type SettingsSection = {
  id: string;
  icon: string;
  iconBg: string;
  label: string;
  sub?: string;
  value?: string;
  right?: string;
  isSwitch?: boolean;
  switchValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
};

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

export default function SettingsScreen() {
  const { theme, themeId } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { plan, accountId, logout } = useAuthStore((state) => ({
    plan: state.plan,
    accountId: state.accountId,
    logout: state.logout
  }));
  const { clearAllData, quietHours, setQuietHours } = useSubscriptionStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const quietWindowLabel = `${formatHour(quietHours.startHour)} – ${formatHour(quietHours.endHour)}`;
  const QUIET_PRESETS: Array<{ label: string; startHour: number; endHour: number }> = [
    { label: "10 PM – 8 AM", startHour: 22, endHour: 8 },
    { label: "11 PM – 7 AM", startHour: 23, endHour: 7 },
    { label: "9 PM – 9 AM", startHour: 21, endHour: 9 },
    { label: "Midnight – 9 AM", startHour: 0, endHour: 9 }
  ];

  const userEmail = accountId ?? "you@example.com";
  const userPlan = (plan ?? "free") as UserPlan;

  const themeLabel = useMemo(() => {
    switch (themeId) {
      case "genz":
        return "Pulse";
      case "genx":
        return "Command";
      case "millennial":
      default:
        return "Clarity";
    }
  }, [themeId]);

  const planBadgeConfig: Record<UserPlan, { label: string; style: any; text: any; icon?: string }> = {
    free: {
      label: "Free plan",
      style: [styles.planBadge, styles.planBadgeFree],
      text: styles.planBadgeFreeText
    },
    pro: {
      label: "✦ Pro",
      style: [styles.planBadge, styles.planBadgePro],
      text: styles.planBadgeProText
    },
    family: {
      label: "👨‍👩‍👧 Family",
      style: [styles.planBadge, styles.planBadgeFamily],
      text: styles.planBadgeFamilyText
    }
  };

  const planBadge = planBadgeConfig[userPlan];

  const sections: Array<{ title: string; rows: SettingsSection[]; topPad?: number }> = [
    {
      title: "ACCOUNT",
      rows: [
        {
          id: "profile",
          icon: "👤",
          iconBg: theme.primarySurface,
          label: "Profile",
          value: userEmail.length > 24 ? `${userEmail.slice(0, 21)}...` : userEmail,
          right: "›",
          onPress: () => {}
        },
        {
          id: "plan",
          icon: "⭐",
          iconBg: theme.warningSurface,
          label: "Subscription plan",
          value:
            userPlan === "pro" ? "✦ Pro" : userPlan === "family" ? "Family" : "Free",
          right: "›",
          onPress: () => router.push("/paywall")
        },
        {
          id: "security",
          icon: "🔒",
          iconBg: theme.successSurface,
          label: "Security",
          sub: "Face ID · PIN fallback",
          right: "›",
          onPress: () => {}
        }
      ]
    },
    {
      title: "APPEARANCE",
      rows: [
        {
          id: "theme",
          icon: "🎨",
          iconBg: withAlpha(theme.secondary, 0.12),
          label: "Theme",
          sub: "Pulse · Clarity · Command",
          value: themeLabel,
          right: "›",
          onPress: () => {}
        },
        {
          id: "app-icon",
          icon: "📱",
          iconBg: theme.surfaceAlt,
          label: "App icon",
          value: "Default",
          right: "›",
          onPress: () => {}
        }
      ]
    },
    {
      title: "NOTIFICATIONS",
      rows: [
        {
          id: "notifications",
          icon: "🔔",
          iconBg: theme.warningSurface,
          label: "Push notifications",
          isSwitch: true,
          switchValue: notificationsEnabled
        },
        {
          id: "quiet-hours",
          icon: "🌙",
          iconBg: theme.surfaceAlt,
          label: "Quiet hours",
          sub: quietHours.enabled ? `${quietWindowLabel} · reminders shift to morning` : "Off",
          isSwitch: true,
          switchValue: quietHours.enabled,
          onToggle: (value) => setQuietHours({ enabled: value })
        },
        {
          id: "quiet-window",
          icon: "🕘",
          iconBg: theme.surfaceAlt,
          label: "Quiet window",
          value: quietWindowLabel,
          right: "›",
          onPress: () => {
            Alert.alert(
              "Quiet window",
              "Renewal reminders that fall inside this window are delayed to the end of it.",
              [
                ...QUIET_PRESETS.map((preset) => ({
                  text: preset.label,
                  onPress: () => setQuietHours({ startHour: preset.startHour, endHour: preset.endHour, enabled: true })
                })),
                { text: "Cancel", style: "cancel" as const }
              ]
            );
          }
        },
        {
          id: "alert-style",
          icon: "💬",
          iconBg: theme.surfaceAlt,
          label: "Alert style",
          value: "Banners",
          right: "›",
          onPress: () => {}
        }
      ]
    },
    {
      title: "DATA & PRIVACY",
      rows: [
        {
          id: "connected",
          icon: "🔗",
          iconBg: theme.primarySurface,
          label: "Connected accounts",
          value: "None connected",
          right: "›",
          onPress: () => router.push("/discover")
        },
        {
          id: "delete",
          icon: "🗑",
          iconBg: theme.dangerSurface,
          label: "Delete all data",
          sub: "Permanently removes all subscriptions",
          right: "›",
          onPress: () => {
            Alert.alert("Delete all data", "This will permanently remove all subscription records from this device.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  void clearAllData().then(() => {
                    router.replace("/dashboard");
                  });
                }
              }
            ]);
          }
        }
      ]
    },
    {
      title: "MORE",
      rows: [
        {
          id: "rate",
          icon: "⭐",
          iconBg: theme.warningSurface,
          label: "Rate Zeno",
          sub: "Share your experience on the App Store",
          right: "›",
          onPress: () => void Linking.openURL(APP_STORE_REVIEW_URL)
        },
        {
          id: "share",
          icon: "🔗",
          iconBg: theme.primarySurface,
          label: "Share with friends",
          sub: "Tell others about Zeno",
          right: "›",
          onPress: () => void Share.share({ url: SHARE_URL, message: SHARE_URL })
        },
        {
          id: "feedback",
          icon: "💬",
          iconBg: theme.surfaceAlt,
          label: "Send feedback",
          sub: "Help us improve Zeno",
          right: "›",
          onPress: () => void Linking.openURL(FEEDBACK_EMAIL)
        },
        {
          id: "privacy",
          icon: "📄",
          iconBg: theme.surfaceAlt,
          label: "Privacy Policy",
          right: "›",
          onPress: () => void Linking.openURL(PRIVACY_URL)
        },
        {
          id: "terms",
          icon: "📋",
          iconBg: theme.surfaceAlt,
          label: "Terms of Service",
          right: "›",
          onPress: () => void Linking.openURL(TERMS_URL)
        }
      ],
      topPad: 20
    }
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageHeader}>Settings</Text>

        <View style={styles.profileBlock}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatarOuter} accessible={false} importantForAccessibility="no-hide-descendants">
              <View style={styles.profileAvatarInner}>
                <Text style={styles.avatarLetter}>{userEmail[0]?.toUpperCase() ?? "Z"}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {userEmail}
              </Text>
              <View style={planBadge.style}>
                <Text style={planBadge.text}>{planBadge.label}</Text>
              </View>
            </View>
            <Text style={styles.profileChevron} accessible={false}>›</Text>
          </View>
        </View>

        {userPlan === "free" ? (
          <View style={styles.upgradeBanner}>
            <View style={styles.upgradeIcon} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={styles.upgradeIconText}>✦</Text>
            </View>
            <View style={styles.upgradeTexts}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSub}>
                Unlock email scan, 3-day alerts, and cancel guides for 400+ services.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro"
              style={styles.upgradeButton}
              onPress={() => router.push("/paywall")}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </Pressable>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[styles.sectionLabel, section.topPad ? { paddingTop: section.topPad } : undefined]}>
              {section.title}
            </Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, index) => {
                const isLast = index === section.rows.length - 1;
                const valueColor = userPlan === "pro" && row.id === "plan" ? theme.primary : undefined;

                const inner = (
                  <View style={styles.row}>
                    <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]} accessible={false} importantForAccessibility="no-hide-descendants">
                      <Text style={styles.rowIconText}>{row.icon}</Text>
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {row.label}
                      </Text>
                      {row.sub ? <Text style={styles.rowSub}>{row.sub}</Text> : null}
                    </View>
                    {row.isSwitch ? (
                      <Switch
                        accessibilityRole="switch"
                        accessibilityLabel={row.label}
                        value={row.switchValue ?? notificationsEnabled}
                        onValueChange={(value) => {
                          if (row.onToggle) {
                            row.onToggle(value);
                          } else {
                            setNotificationsEnabled(value);
                          }
                        }}
                        trackColor={{ false: theme.surfaceAlt, true: theme.success }}
                        thumbColor={theme.onPrimary}
                      />
                    ) : null}
                    {!row.isSwitch && row.value ? (
                      <Text
                        style={[
                          styles.rowValue,
                          valueColor ? { color: valueColor } : undefined,
                          row.id === "app-icon" || row.id === "profile" || row.id === "connected" ? { maxWidth: 120 } : undefined
                        ]}
                        numberOfLines={1}
                      >
                        {row.value}
                      </Text>
                    ) : null}
                    {row.right && !row.isSwitch ? <Text style={styles.rowChevron} accessible={false}>{row.right}</Text> : null}
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.signOutCard}
          onPress={() => {
            Alert.alert("Sign out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: () => void logout()
              }
            ]);
          }}
        >
          <View style={styles.signOutIconWrap} accessible={false} importantForAccessibility="no-hide-descendants">
            <Text style={styles.signOutIcon}>🚪</Text>
          </View>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

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
    screen: {
      flex: 1,
      backgroundColor: theme.background
    },
    content: {
      paddingBottom: 100,
      paddingTop: 0,
      backgroundColor: theme.background
    },
    pageHeader: {
      paddingHorizontal: spacing.screenH,
      paddingTop: 16,
      paddingBottom: 4,
      color: theme.text,
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -1.5
    },
    profileBlock: {
      paddingHorizontal: spacing.screenH,
      paddingTop: 16,
      paddingBottom: 4
    },
    profileCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 16
    },
    profileAvatarOuter: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center"
    },
    profileAvatarInner: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent"
    },
    avatarLetter: {
      ...typography.title2,
      color: theme.onPrimary,
      fontSize: 24,
      letterSpacing: -2,
      lineHeight: 54,
      textAlign: "center"
    },
    profileInfo: {
      flex: 1,
      minWidth: 0
    },
    profileName: {
      ...typography.headline,
      fontSize: 17,
      fontWeight: "600",
      letterSpacing: -0.3,
      color: theme.text
    },
    planBadge: {
      marginTop: 6,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start"
    },
    planBadgeFree: {
      backgroundColor: "transparent"
    },
    planBadgeFreeText: {
      color: theme.mutedText,
      ...typography.caption1,
      fontWeight: "500"
    },
    planBadgePro: {
      backgroundColor: theme.primarySurface,
      borderColor: withAlpha(theme.primary, 0.25),
      borderWidth: 0.5
    },
    planBadgeProText: {
      color: theme.primary,
      ...typography.footnote,
      fontWeight: "600",
      fontSize: 12
    },
    planBadgeFamily: {
      backgroundColor: theme.successSurface,
      borderColor: withAlpha(theme.success, 0.2),
      borderWidth: 0.5
    },
    planBadgeFamilyText: {
      color: theme.success,
      ...typography.footnote,
      fontWeight: "600",
      fontSize: 12
    },
    profileChevron: {
      fontSize: 20,
      color: theme.quietText
    },
    upgradeBanner: {
      marginHorizontal: spacing.screenH,
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: withAlpha(theme.primary, 0.2),
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: theme.primarySurface
    },
    upgradeIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primarySurface
    },
    upgradeIconText: {
      color: theme.primary,
      fontSize: 20,
      lineHeight: 20
    },
    upgradeTexts: {
      flex: 1
    },
    upgradeTitle: {
      ...typography.callout,
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
      letterSpacing: -0.2
    },
    upgradeSub: {
      ...typography.caption1,
      marginTop: 3,
      color: theme.mutedText,
      lineHeight: 18
    },
    upgradeButton: {
      backgroundColor: theme.primary,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7
    },
    upgradeButtonText: {
      ...typography.caption1,
      color: theme.onPrimary,
      fontWeight: "600",
      fontSize: 13
    },
    sectionLabel: {
      ...typography.sectionHeader,
      color: theme.mutedText,
      paddingHorizontal: spacing.screenH,
      paddingTop: 20,
      paddingBottom: 8
    },
    sectionCard: {
      marginHorizontal: spacing.screenH,
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: "hidden"
    },
    row: {
      position: "relative",
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 14
    },
    rowIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    },
    rowIconText: {
      fontSize: 15
    },
    rowTextWrap: {
      flex: 1,
      minWidth: 0
    },
    rowTitle: {
      ...typography.callout,
      fontSize: 16,
      color: theme.text,
      letterSpacing: -0.2
    },
    rowSub: {
      ...typography.caption1,
      color: theme.mutedText,
      marginTop: 2
    },
    rowValue: {
      ...typography.subheadline,
      color: theme.mutedText,
      maxWidth: 130,
      textAlign: "right"
    },
    rowChevron: {
      color: theme.quietText,
      fontSize: 18,
      lineHeight: 18,
      marginLeft: 2
    },
    separator: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 0.5,
      backgroundColor: theme.border
    },
    signOutCard: {
      marginHorizontal: spacing.screenH,
      marginTop: 8,
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: "hidden",
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14
    },
    signOutIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: theme.dangerSurface,
      alignItems: "center",
      justifyContent: "center"
    },
    signOutIcon: {
      fontSize: 15
    },
    signOutText: {
      ...typography.callout,
      fontSize: 16,
      color: theme.danger,
      letterSpacing: -0.2
    },
    versionSection: {
      paddingTop: 24,
      paddingBottom: 24,
      alignItems: "center"
    },
    versionText: {
      ...typography.caption2,
      color: theme.quietText,
      letterSpacing: 0.02
    },
    versionSub: {
      ...typography.caption1,
      color: theme.quietText,
      textAlign: "center",
      marginTop: 4,
      lineHeight: 18
    }
  });
}
