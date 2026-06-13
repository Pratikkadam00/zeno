import { router } from "expo-router";
import { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { spacing } from "../src/theme/spacing";
import { type } from "../src/theme/typography";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";

type ThemeOption = {
  id: "millennial" | "genz" | "genx";
  name: string;
  description: string;
  icon: string;
  dots: string[];
  preview: {
    background: string;
    avatarBg: string;
    avatarText: string;
    nameColor: string;
    nameSize: number;
    nameFont?: "monospace";
    badgeBg: string;
    badgeText: string;
    badgeLabel: string;
  };
};

// Preview swatches intentionally hardcode each theme's palette: every card
// shows what THAT theme looks like, regardless of the active theme.
const themeOptions: ThemeOption[] = [
  {
    id: "genz",
    name: "Pulse",
    description: "For Gen Z · bold & dark",
    icon: "⚡",
    dots: ["#7C3AED", "#F43F5E", "#84CC16"],
    preview: {
      background: "#09090B",
      avatarBg: "rgba(191,90,242,0.15)",
      avatarText: "#BF5AF2",
      nameColor: "#FFFFFF",
      nameSize: 12,
      badgeBg: "rgba(255,69,58,0.15)",
      badgeText: "#FF6961",
      badgeLabel: "7 days"
    }
  },
  {
    id: "millennial",
    name: "Clarity",
    description: "For Millennials · clean & minimal",
    icon: "◈",
    dots: ["#2563EB", "#0D9488", "#F8FAFC"],
    preview: {
      background: "#F8FAFC",
      avatarBg: "rgba(10,132,255,0.1)",
      avatarText: "#2563EB",
      nameColor: "#0F172A",
      nameSize: 12,
      badgeBg: "rgba(254,226,226,1)",
      badgeText: "#DC2626",
      badgeLabel: "7 days"
    }
  },
  {
    id: "genx",
    name: "Command",
    description: "For Gen X · dense & precise",
    icon: ">",
    dots: ["#15803D", "#D97706", "#0F172A"],
    preview: {
      background: "#0F172A",
      avatarBg: "rgba(21,128,61,0.15)",
      avatarText: "#15803D",
      nameColor: "#94A3B8",
      nameSize: 11,
      nameFont: "monospace",
      badgeBg: "rgba(239,68,68,0.12)",
      badgeText: "#FCA5A5",
      badgeLabel: "7 days"
    }
  }
];

export default function OnboardingScreen() {
  const { theme, themeId, setThemeId } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topContainer}>
          <Text style={styles.wordmark}>zeno</Text>

          <Text style={styles.headlineLine}>Finally know</Text>
          <Text style={styles.headlineLineSecondary}>what you pay.</Text>

          <Text style={styles.heroBody}>
            Zeno finds every subscription you pay for and warns you before each
            renewal — without ever needing your bank login.
          </Text>
        </View>

        <View style={styles.featureGroup}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, styles.featureIconSearch]} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={styles.featureIconText}>🔍</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Auto-discovers subscriptions</Text>
              <Text style={styles.featureSubtitle}>Scans email receipts on-device only</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, styles.featureIconAlerts]} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={styles.featureIconText}>🔔</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Warns you 7 and 3 days before</Text>
              <Text style={styles.featureSubtitle}>One tap opens the cancel page</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, styles.featureIconSafe]} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={styles.featureIconText}>🔒</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>No bank login. Ever.</Text>
              <Text style={styles.featureSubtitle}>Your data stays encrypted on device</Text>
            </View>
          </View>
        </View>

        <Text style={styles.themeHeading}>Choose your style</Text>
        <Text style={styles.themeSubheading}>Your style preference changes how your account feels.</Text>

        <View style={styles.themeCards}>
          {themeOptions.map((option) => {
            const selected = themeId === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.name} theme, ${option.description}`}
                onPress={() => setThemeId(option.id)}
                style={({ pressed }) => [
                  styles.themeCard,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    borderWidth: selected ? 2 : 0.5,
                    opacity: pressed ? 0.95 : 1
                  }
                ]}
              >
                <View style={styles.themeCardHeader}>
                  <View style={styles.themeTitleWrap}>
                    <Text style={styles.themeIcon} accessible={false}>{option.icon}</Text>
                    <Text style={styles.themeName}>{option.name}</Text>
                    <Text style={styles.themeDescription}>{option.description}</Text>
                  </View>
                  <View style={[styles.checkIndicator, selected && styles.checkIndicatorSelected]} accessible={false} importantForAccessibility="no-hide-descendants">
                    {selected ? <Text style={styles.checkmarkText}>✓</Text> : null}
                  </View>
                </View>

                <View style={styles.dotsRow} accessible={false} importantForAccessibility="no-hide-descendants">
                  {option.dots.map((dot) => (
                    <View key={`${option.id}-${dot}`} style={[styles.themeDot, { backgroundColor: dot }]} />
                  ))}
                </View>

                <View style={[styles.preview, { backgroundColor: option.preview.background }]} accessible={false} importantForAccessibility="no-hide-descendants">
                  <View style={styles.previewItem}>
                    <View style={[styles.previewAvatar, { backgroundColor: option.preview.avatarBg }]}>
                      <Text style={[styles.previewAvatarText, { color: option.preview.avatarText }]}>A</Text>
                    </View>
                    <View style={styles.previewMain}>
                      <Text
                        style={[
                          styles.previewName,
                          {
                            color: option.preview.nameColor,
                            fontSize: option.preview.nameSize,
                            fontFamily: option.preview.nameFont ? "Courier" : undefined
                          }
                        ]}
                      >
                        Adobe CC
                      </Text>
                    </View>
                    <View style={[styles.previewBadge, { backgroundColor: option.preview.badgeBg }]}>
                      <Text style={[styles.previewBadgeText, { color: option.preview.badgeText }]}>
                        {option.preview.badgeLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.privacyBlock}>
          <Text style={styles.privacyText}>Your preference is saved locally.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/dashboard")}
          style={styles.startButton}
        >
          <Text style={styles.startButtonText}>Start tracking</Text>
        </Pressable>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomHint}>Already have an account?</Text>
          <Pressable accessibilityRole="link" accessibilityLabel="Sign in" hitSlop={8} onPress={() => router.push("/login")}>
            <Text style={styles.bottomLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "space-between",
      paddingHorizontal: 28,
      paddingTop: 72,
      paddingBottom: 40,
      gap: spacing.sectionGap
    },
    topContainer: {
      gap: 12
    },
    wordmark: {
      fontSize: 42,
      fontWeight: "800",
      letterSpacing: -2.5,
      color: theme.text
    },
    headlineLine: {
      fontSize: 38,
      fontWeight: "700",
      letterSpacing: -1.8,
      lineHeight: 42,
      color: theme.text
    },
    headlineLineSecondary: {
      ...type.headline,
      fontSize: 38,
      fontWeight: "700",
      letterSpacing: -1.8,
      lineHeight: 42,
      color: theme.mutedText,
      marginBottom: 20
    },
    heroBody: {
      ...type.callout,
      color: theme.mutedText,
      lineHeight: 24,
      marginTop: 0
    },
    featureGroup: {
      marginTop: 40,
      borderRadius: spacing.groupRadius,
      overflow: "hidden",
      backgroundColor: theme.card
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingLeft: 14,
      paddingRight: 14,
      paddingVertical: 14,
      gap: 16
    },
    featureIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center"
    },
    featureIconSearch: {
      backgroundColor: theme.primarySurface
    },
    featureIconAlerts: {
      backgroundColor: theme.warningSurface
    },
    featureIconSafe: {
      backgroundColor: theme.successSurface
    },
    featureIconText: {
      fontSize: 16
    },
    featureText: {
      flex: 1,
      minWidth: 0
    },
    featureTitle: {
      ...type.subheadline,
      color: theme.text
    },
    featureSubtitle: {
      ...type.caption1,
      color: theme.mutedText,
      marginTop: 2
    },
    divider: {
      left: 62,
      right: 0,
      height: 0.5,
      backgroundColor: theme.border
    },
    themeHeading: {
      fontSize: 28,
      fontWeight: "700",
      letterSpacing: -1.5,
      color: theme.text,
      marginTop: 2
    },
    themeSubheading: {
      ...type.subheadline,
      color: theme.mutedText,
      marginTop: 8,
      marginBottom: -4
    },
    themeCards: {
      gap: 12
    },
    themeCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      overflow: "hidden"
    },
    themeCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16
    },
    themeTitleWrap: {
      flex: 1,
      minWidth: 0,
      gap: 6
    },
    themeIcon: {
      fontSize: 20,
      color: theme.text,
      marginBottom: 2
    },
    themeName: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.5
    },
    themeDescription: {
      ...type.footnote,
      color: theme.mutedText
    },
    checkIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.quietText,
      alignItems: "center",
      justifyContent: "center"
    },
    checkIndicatorSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary
    },
    checkmarkText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.onPrimary
    },
    dotsRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 20
    },
    themeDot: {
      width: 12,
      height: 12,
      borderRadius: 6
    },
    preview: {
      height: 100,
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: "center"
    },
    previewItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    previewAvatar: {
      width: 24,
      height: 24,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center"
    },
    previewAvatarText: {
      fontSize: 14,
      fontWeight: "700"
    },
    previewMain: {
      flex: 1,
      minWidth: 0
    },
    previewName: {
      fontWeight: "600",
      lineHeight: 16
    },
    previewBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10
    },
    previewBadgeText: {
      fontSize: 11,
      fontWeight: "700"
    },
    privacyBlock: {
      alignItems: "center"
    },
    privacyText: {
      ...type.caption2,
      color: theme.quietText,
      textAlign: "center"
    },
    startButton: {
      width: "100%",
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center"
    },
    startButtonText: {
      ...type.body,
      color: theme.onPrimary,
      fontSize: 17,
      fontWeight: "600"
    },
    bottomRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 4
    },
    bottomHint: {
      ...type.footnote,
      color: theme.mutedText
    },
    bottomLink: {
      ...type.footnote,
      fontWeight: "600",
      color: theme.primary
    }
  });
}
