import { useMemo, useState } from "react";
import { useAuthStore } from "../src/auth/authStore";
import { colors } from "../src/theme/colors";
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
import { useSubRadarTheme } from "../src/theme/theme-provider";

const APP_STORE_REVIEW_URL = "https://apps.apple.com/";
const TERMS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";
const FEEDBACK_EMAIL = "mailto:feedback@zeno.app";
const SHARE_URL = "https://example.com/zeno";
const APP_VERSION = "1.0.0";
const quietHoursRange = "10:00 PM – 8:00 AM";

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
  onPress?: () => void;
};

export default function SettingsScreen() {
  const { themeId } = useSubRadarTheme();
  const { plan, accountId, logout } = useAuthStore((state) => ({
    plan: state.plan,
    accountId: state.accountId,
    logout: state.logout
  }));
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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
      label: "âœ¦ Pro",
      style: [styles.planBadge, styles.planBadgePro],
      text: styles.planBadgeProText
    },
    family: {
      label: "ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Family",
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
          icon: "ðŸ‘¤",
          iconBg: "rgba(10,132,255,0.12)",
          label: "Profile",
          value: userEmail.length > 24 ? `${userEmail.slice(0, 21)}...` : userEmail,
          right: "›",
          onPress: () => {}
        },
        {
          id: "plan",
          icon: "â­",
          iconBg: "rgba(255,214,10,0.12)",
          label: "Subscription plan",
          value:
            userPlan === "pro" ? "âœ¦ Pro" : userPlan === "family" ? "Family" : "Free",
          right: "›",
          onPress: () => router.push("/paywall")
        },
        {
          id: "security",
          icon: "ðŸ”’",
          iconBg: "rgba(48,209,88,0.12)",
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
          icon: "ðŸŽ¨",
          iconBg: "rgba(191,90,242,0.12)",
          label: "Theme",
          sub: "Pulse · Clarity · Command",
          value: themeLabel,
          right: "›",
          onPress: () => {}
        },
        {
          id: "app-icon",
          icon: "ðŸ“±",
          iconBg: "rgba(255,255,255,0.06)",
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
          icon: "ðŸ””",
          iconBg: "rgba(255,159,10,0.12)",
          label: "Push notifications",
          isSwitch: true,
          switchValue: notificationsEnabled
        },
        {
          id: "quiet-hours",
          icon: "ðŸŒ™",
          iconBg: "rgba(255,255,255,0.06)",
          label: "Quiet hours",
          sub: quietHoursRange,
          right: "›",
          onPress: () => {}
        },
        {
          id: "alert-style",
          icon: "ðŸ’¬",
          iconBg: "rgba(255,255,255,0.06)",
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
          icon: "ðŸ”—",
          iconBg: "rgba(10,132,255,0.12)",
          label: "Connected accounts",
          value: "None connected",
          right: "›",
          onPress: () => router.push("/discovery")
        },
        {
          id: "export",
          icon: "ðŸ“¤",
          iconBg: "rgba(48,209,88,0.12)",
          label: "Export data",
          sub: "Download all your subscription data",
          right: "›",
          onPress: () => {}
        },
        {
          id: "delete",
          icon: "ðŸ—‘",
          iconBg: "rgba(255,69,58,0.08)",
          label: "Delete all data",
          sub: "Permanently removes all subscriptions",
          right: "›",
          onPress: () => {
            Alert.alert("Delete all data", "This will permanently remove all subscription records from this device.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {}
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
          icon: "â­",
          iconBg: "rgba(255,214,10,0.12)",
          label: "Rate Zeno",
          sub: "Share your experience on the App Store",
          right: "›",
          onPress: () => void Linking.openURL(APP_STORE_REVIEW_URL)
        },
        {
          id: "share",
          icon: "ðŸ”—",
          iconBg: "rgba(10,132,255,0.12)",
          label: "Share with friends",
          sub: "Tell others about Zeno",
          right: "›",
          onPress: () => void Share.share({ url: SHARE_URL, message: SHARE_URL })
        },
        {
          id: "feedback",
          icon: "ðŸ’¬",
          iconBg: "rgba(255,255,255,0.06)",
          label: "Send feedback",
          sub: "Help us improve Zeno",
          right: "›",
          onPress: () => void Linking.openURL(FEEDBACK_EMAIL)
        },
        {
          id: "privacy",
          icon: "ðŸ“„",
          iconBg: "rgba(255,255,255,0.06)",
          label: "Privacy Policy",
          right: "›",
          onPress: () => void Linking.openURL(PRIVACY_URL)
        },
        {
          id: "terms",
          icon: "ðŸ“‹",
          iconBg: "rgba(255,255,255,0.06)",
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
            <View style={styles.profileAvatarOuter}>
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
            <Text style={styles.profileChevron}>›</Text>
          </View>
        </View>

        {userPlan === "free" ? (
          <View style={styles.upgradeBanner}>
            <View style={styles.upgradeIcon}>
              <Text style={styles.upgradeIconText}>✦</Text>
            </View>
            <View style={styles.upgradeTexts}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSub}>
                Unlock email scan, 3-day alerts, and cancel guides for 400+ services.
              </Text>
            </View>
            <Pressable style={styles.upgradeButton} onPress={() => router.push("/paywall")}>
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
                const valueColor = userPlan === "pro" && row.id === "plan" ? colors.blue : undefined;

                const inner = (
                  <View style={styles.row}>
                    <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
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
                        value={row.switchValue ?? notificationsEnabled}
                        onValueChange={(value) => {
                          setNotificationsEnabled(value);
                        }}
                        trackColor={{ false: colors.surfaceHigher, true: colors.green }}
                        thumbColor="#fff"
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
                    {row.right && !row.isSwitch ? <Text style={styles.rowChevron}>{row.right}</Text> : null}
                    {!isLast ? <View style={styles.separator} /> : null}
                  </View>
                );

                if (row.isSwitch || !row.onPress) {
                  return <View key={row.id}>{inner}</View>;
                }

                return (
                  <Pressable key={row.id} onPress={row.onPress}>
                    {inner}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
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
          <View style={styles.signOutIconWrap}>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    paddingBottom: 100,
    paddingTop: 0,
    backgroundColor: colors.bg
  },
  pageHeader: {
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    paddingBottom: 4,
    color: colors.label,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.blue,
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
    color: "#fff",
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
    color: colors.label
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
    color: colors.label3,
    ...typography.caption1,
    fontWeight: "500"
  },
  planBadgePro: {
    backgroundColor: "rgba(10,132,255,0.12)",
    borderColor: "rgba(10,132,255,0.25)",
    borderWidth: 0.5
  },
  planBadgeProText: {
    color: colors.blue,
    ...typography.footnote,
    fontWeight: "600",
    fontSize: 12
  },
  planBadgeFamily: {
    backgroundColor: "rgba(48,209,88,0.12)",
    borderColor: "rgba(48,209,88,0.2)",
    borderWidth: 0.5
  },
  planBadgeFamilyText: {
    color: colors.green,
    ...typography.footnote,
    fontWeight: "600",
    fontSize: 12
  },
  profileChevron: {
    fontSize: 20,
    color: colors.label4
  },
  upgradeBanner: {
    marginHorizontal: spacing.screenH,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(10,132,255,0.2)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(10,132,255,0.08)"
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,132,255,0.12)"
  },
  upgradeIconText: {
    color: colors.blue,
    fontSize: 20,
    lineHeight: 20
  },
  upgradeTexts: {
    flex: 1
  },
  upgradeTitle: {
    ...typography.callout,
    color: colors.label,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2
  },
  upgradeSub: {
    ...typography.caption1,
    marginTop: 3,
    color: colors.label3,
    lineHeight: 18
  },
  upgradeButton: {
    backgroundColor: colors.blue,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  upgradeButtonText: {
    ...typography.caption1,
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },
  sectionLabel: {
    ...typography.sectionHeader,
    color: colors.label3,
    paddingHorizontal: spacing.screenH,
    paddingTop: 20,
    paddingBottom: 8
  },
  sectionCard: {
    marginHorizontal: spacing.screenH,
    backgroundColor: colors.surface,
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
    color: colors.label,
    letterSpacing: -0.2
  },
  rowSub: {
    ...typography.caption1,
    color: colors.label3,
    marginTop: 2
  },
  rowValue: {
    ...typography.subheadline,
    color: colors.label3,
    maxWidth: 130,
    textAlign: "right"
  },
  rowChevron: {
    color: colors.label4,
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
    backgroundColor: colors.separator
  },
  signOutCard: {
    marginHorizontal: spacing.screenH,
    marginTop: 8,
    backgroundColor: colors.surface,
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
    backgroundColor: "rgba(255,69,58,0.08)",
    alignItems: "center",
    justifyContent: "center"
  },
  signOutIcon: {
    fontSize: 15
  },
  signOutText: {
    ...typography.callout,
    fontSize: 16,
    color: colors.red,
    letterSpacing: -0.2
  },
  versionSection: {
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: "center"
  },
  versionText: {
    ...typography.caption2,
    color: colors.label4,
    letterSpacing: 0.02
  },
  versionSub: {
    ...typography.caption1,
    color: colors.label4,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18
  }
});
