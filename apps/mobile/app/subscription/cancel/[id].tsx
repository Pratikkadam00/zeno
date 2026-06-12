import { findServiceBySlug } from "@subradar/service-catalog";
import type { BillingCycle, CancellationDifficulty } from "@subradar/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useSubscriptionStore } from "../../../src/data/subscription-store";
import { cancelNotificationsForSubscription } from "../../../src/notifications/notificationService";
import { formatMoney } from "../../../src/notifications/renewal-reminders";
import { useZenoTheme } from "../../../src/theme/theme-provider";
import { colors } from "../../../src/theme/colors";
import { type as typography } from "../../../src/theme/typography";
import { spacing } from "../../../src/theme/spacing";

// ─── Pure helpers (logic unchanged) ──────────────────────────────────────────

function getAvatarStyle(category: string): { bg: string; text: string } {
  switch (category) {
    case "entertainment": return { bg: "rgba(255,69,58,0.15)",   text: "#FF453A" };
    case "ai_tools":      return { bg: "rgba(191,90,242,0.15)",  text: "#BF5AF2" };
    case "productivity":  return { bg: "rgba(10,132,255,0.15)",  text: "#0A84FF" };
    case "health":        return { bg: "rgba(255,159,10,0.15)",  text: "#FF9F0A" };
    case "finance":       return { bg: "rgba(90,200,245,0.15)",  text: "#5AC8F5" };
    case "education":     return { bg: "rgba(255,214,10,0.15)",  text: "#FFD60A" };
    case "developer_tools": return { bg: "rgba(191,90,242,0.15)", text: "#BF5AF2" };
    case "family":        return { bg: "rgba(48,209,88,0.15)",   text: "#30D158" };
    default:              return { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)" };
  }
}

function getDifficultyMeta(difficulty: CancellationDifficulty) {
  if (difficulty === "easy")    return { label: "✓ Easy to cancel",  bg: "rgba(48,209,88,0.08)",  border: "rgba(48,209,88,0.2)",  color: "rgba(48,209,88,0.8)"   };
  if (difficulty === "medium")  return { label: "⚠ Moderate steps",  bg: "rgba(255,159,10,0.08)", border: "rgba(255,159,10,0.2)", color: "rgba(255,159,10,0.8)"  };
  if (difficulty === "hard")    return { label: "✕ Hard to cancel",  bg: "rgba(255,69,58,0.08)",  border: "rgba(255,69,58,0.2)",  color: "rgba(255,69,58,0.8)"   };
  return { label: "⚠ Dark pattern — they will try to stop you", bg: "rgba(255,69,58,0.1)", border: "rgba(255,69,58,0.25)", color: "rgba(255,100,100,0.9)" };
}

function getGenericSteps(serviceName: string): string[] {
  return [
    `Open the ${serviceName} website or app`,
    "Go to Account Settings or Profile",
    "Find Subscription or Billing section",
    "Look for Cancel or Manage subscription",
    "Follow prompts to confirm cancellation"
  ];
}

function getAnnualAmountMinor(amountMinor: number, cycle: BillingCycle): number {
  if (cycle === "weekly")    return amountMinor * 52;
  if (cycle === "quarterly") return amountMinor * 4;
  if (cycle === "annual")    return amountMinor;
  return amountMinor * 12;
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getThemeCta(themeId: string): string {
  if (themeId === "genz")  return "🔥 Kill This Sub";
  if (themeId === "genx")  return "> PROCEED TO CANCELLATION";
  return "Cancel Subscription";
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SubscriptionCancelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useZenoTheme();
  const { subscriptions, updateSubscription } = useSubscriptionStore();
  const subscription = subscriptions.find((item) => item.id === id);

  const [currentStep, setCurrentStep]     = useState(0);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [supportOpen, setSupportOpen]     = useState(false);

  const confirmAnim   = useRef(new Animated.Value(0)).current;
  const confirmSlide  = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (showConfirm) {
      confirmAnim.setValue(0);
      confirmSlide.setValue(-10);
      Animated.spring(confirmAnim,  { toValue: 1, useNativeDriver: true }).start();
      Animated.spring(confirmSlide, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [showConfirm, confirmAnim, confirmSlide]);

  // ── Not found ──
  if (!subscription) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.navBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backChevron}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>
          <View style={styles.notFoundWrap}>
            <Text style={styles.notFoundText}>Subscription not found</Text>
            <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const sub = subscription;
  const service = sub.serviceSlug ? findServiceBySlug(sub.serviceSlug) : undefined;
  const avatar = getAvatarStyle(sub.category);
  const difficulty = service?.cancellationDifficulty ? getDifficultyMeta(service.cancellationDifficulty) : null;
  const annualMinor = getAnnualAmountMinor(sub.price.amountMinor, sub.billingCycle);
  const steps = service?.cancellationGuideSteps?.length
    ? service.cancellationGuideSteps
    : getGenericSteps(sub.name);
  const cancelUrl = service?.cancellationUrl ?? service?.website;
  const ctaText = getThemeCta(theme.id);
  const [amountWhole, amountDecimal] = (sub.price.amountMinor / 100).toFixed(2).split(".");

  async function handleOpenCancelPage() {
    if (cancelUrl) await Linking.openURL(cancelUrl);
    setCurrentStep(1);
    setShowConfirm(true);
  }

  async function handleConfirmedCancel() {
    updateSubscription(sub.id, { status: "cancelled" });
    await cancelNotificationsForSubscription(sub.id);
    setCancelSuccess(true);
    setTimeout(() => router.replace("/dashboard"), 2000);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ backgroundColor: colors.bg }}
        >
          {/* Nav bar */}
          <View style={styles.navBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backChevron}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.navTitle}>Cancel subscription</Text>
          </View>

          {/* Service hero */}
          <View style={styles.hero}>
            <View style={[styles.heroAvatar, { backgroundColor: avatar.bg }]}>
              <Text style={[styles.heroAvatarText, { color: avatar.text }]}>{getInitial(sub.name)}</Text>
            </View>
            <Text style={styles.heroName}>{sub.name}</Text>
            <Text style={styles.heroMeta}>
              {sub.billingCycle} · {formatMoney(sub.price.amountMinor, sub.price.currency)} · renews in{" "}
              {service ? "soon" : "—"}
            </Text>
          </View>

          {/* Savings card */}
          {annualMinor > 0 ? (
            <View style={styles.savingsCard}>
              <View style={styles.savingsIcon}>
                <Text style={{ fontSize: 18, textAlign: "center", lineHeight: 36 }}>🐷</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savingsLabel}>Cancelling saves you</Text>
              </View>
              <Text style={styles.savingsAmount}>
                {formatMoney(annualMinor, sub.price.currency)}/yr
              </Text>
            </View>
          ) : null}

          {/* Difficulty badge */}
          {difficulty ? (
            <View style={[styles.difficultyBadge, { backgroundColor: difficulty.bg, borderColor: difficulty.border }]}>
              <Text style={[styles.difficultyText, { color: difficulty.color }]}>{difficulty.label}</Text>
            </View>
          ) : null}

          {/* Steps */}
          <Text style={styles.sectionLabel}>HOW TO CANCEL</Text>
          <View style={styles.stepsList}>
            {steps.map((step, index) => {
              const state = index < currentStep ? "done" : index === currentStep ? "current" : "upcoming";
              return (
                <View key={`${index}-${step}`} style={styles.stepRow}>
                  <View style={[
                    styles.stepCircle,
                    state === "done"    && styles.stepCircleDone,
                    state === "current" && styles.stepCircleCurrent,
                    state === "upcoming"&& styles.stepCircleUpcoming
                  ]}>
                    {state === "done" ? (
                      <Text style={styles.stepCheckText}>✓</Text>
                    ) : (
                      <Text style={[styles.stepNumText, state === "current" ? styles.stepNumCurrent : styles.stepNumUpcoming]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.stepText,
                    state === "current" ? styles.stepTextCurrent : styles.stepTextMuted
                  ]} numberOfLines={0}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Primary CTA */}
          <Pressable style={styles.ctaButton} onPress={() => void handleOpenCancelPage()}>
            <Text style={styles.ctaArrow}>↗</Text>
            <Text style={styles.ctaText}>{ctaText}</Text>
          </Pressable>

          {/* Confirm / Success section */}
          {showConfirm ? (
            cancelSuccess ? (
              <View style={styles.successCard}>
                <Text style={styles.successCheck}>✓</Text>
                <Text style={styles.successTitle}>Subscription cancelled</Text>
                <Text style={styles.successBody}>
                  You'll save {formatMoney(annualMinor, sub.price.currency)}/year from now on.
                </Text>
              </View>
            ) : (
              <Animated.View style={[styles.confirmCard, { opacity: confirmAnim, transform: [{ translateY: confirmSlide }] }]}>
                <Text style={styles.confirmTitle}>Did you cancel it?</Text>
                <View style={styles.confirmButtons}>
                  <Pressable style={styles.yesBtn} onPress={() => void handleConfirmedCancel()}>
                    <Text style={styles.yesBtnText}>Yes, cancelled ✓</Text>
                  </Pressable>
                  <Pressable style={styles.notYetBtn} onPress={() => setShowConfirm(false)}>
                    <Text style={styles.notYetBtnText}>Not yet</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )
          ) : null}

          {/* Support section */}
          <View style={styles.supportCard}>
            <Pressable style={styles.supportToggle} onPress={() => setSupportOpen((o) => !o)}>
              <Text style={styles.supportToggleText}>Having trouble?</Text>
              <Text style={styles.supportToggleChevron}>{supportOpen ? "∧" : "∨"}</Text>
            </Pressable>

            {supportOpen ? (
              <View>
                <View style={styles.supportSep} />
                {service?.supportContact?.email ? (
                  <Pressable style={styles.supportRow} onPress={() => void Linking.openURL(`mailto:${service.supportContact?.email}`)}>
                    <Text style={styles.supportRowText}>✉ Email support</Text>
                  </Pressable>
                ) : null}
                {service?.supportContact?.phone ? (
                  <>
                    {service.supportContact.email ? <View style={styles.supportSep} /> : null}
                    <Pressable style={styles.supportRow} onPress={() => void Linking.openURL(`tel:${service.supportContact?.phone}`)}>
                      <Text style={styles.supportRowText}>📞 Call support</Text>
                    </Pressable>
                  </>
                ) : null}
                <View style={styles.supportSep} />
                <Pressable
                  style={styles.supportRow}
                  onPress={() => void Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(`how to cancel ${sub.name}`)}`)}
                >
                  <Text style={styles.supportRowText}>🔍 Search how to cancel {sub.name}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120, backgroundColor: colors.bg },

  // Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 },
  backChevron: { color: colors.blue, fontSize: 22, lineHeight: 22 },
  backText: { color: colors.blue, fontSize: 17 },
  navTitle: {
    ...typography.headline,
    color: colors.label,
    position: "absolute",
    left: 60, right: 60,
    textAlign: "center"
  },

  // Not found
  notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notFoundText: { ...typography.title3, color: colors.label, marginBottom: 16 },
  secondaryBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.surfaceHigh },
  secondaryBtnText: { ...typography.callout, fontWeight: "600", color: colors.label },

  // Hero
  hero: { alignItems: "center", paddingTop: 24, paddingBottom: 20, paddingHorizontal: spacing.screenH },
  heroAvatar: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroAvatarText: { fontSize: 28, fontWeight: "800" },
  heroName: { ...typography.title2, color: colors.label, letterSpacing: -0.5, textAlign: "center", marginBottom: 4 },
  heroMeta: { ...typography.footnote, color: colors.label3, textAlign: "center" },

  // Savings card
  savingsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "rgba(48,209,88,0.07)",
    borderWidth: 0.5,
    borderColor: "rgba(48,209,88,0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  savingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(48,209,88,0.12)", alignItems: "center", justifyContent: "center" },
  savingsLabel: { fontSize: 13, color: "rgba(48,209,88,0.7)" },
  savingsAmount: { fontSize: 17, fontWeight: "700", color: colors.green, fontVariant: ["tabular-nums"], letterSpacing: -0.5 },

  // Difficulty badge
  difficultyBadge: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.5
  },
  difficultyText: { fontSize: 12, fontWeight: "500", letterSpacing: -0.1 },

  // Steps
  sectionLabel: { ...typography.sectionHeader, color: colors.label3, paddingHorizontal: spacing.screenH, paddingBottom: 12 },
  stepsList: { paddingHorizontal: spacing.screenH },
  stepRow: { flexDirection: "row", gap: 14, marginBottom: 16, alignItems: "flex-start" },
  stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  stepCircleDone:    { backgroundColor: colors.green },
  stepCircleCurrent: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)" },
  stepCircleUpcoming:{ backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.separator },
  stepCheckText: { fontSize: 11, fontWeight: "700", color: "#fff", textAlign: "center", lineHeight: 26 },
  stepNumText: { fontSize: 11, fontWeight: "500", textAlign: "center", lineHeight: 22 },
  stepNumCurrent: { color: "rgba(255,255,255,0.8)" },
  stepNumUpcoming: { color: colors.label4 },
  stepText: { flex: 1, fontSize: 13, lineHeight: 20 },
  stepTextCurrent: { color: colors.label },
  stepTextMuted: { color: colors.label3 },

  // CTA button
  ctaButton: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  ctaArrow: { fontSize: 16, color: colors.bg, lineHeight: 18 },
  ctaText: { fontSize: 16, fontWeight: "600", color: colors.bg, letterSpacing: -0.2 },

  // Confirm card
  confirmCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16
  },
  confirmTitle: { fontSize: 16, fontWeight: "600", color: colors.label, marginBottom: 16 },
  confirmButtons: { flexDirection: "row", gap: 12 },
  yesBtn: { flex: 1, backgroundColor: colors.green, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  yesBtnText: { fontSize: 15, fontWeight: "600", color: "#fff", textAlign: "center" },
  notYetBtn: { flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  notYetBtnText: { fontSize: 15, fontWeight: "500", color: colors.label3, textAlign: "center" },

  // Success card
  successCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "rgba(48,209,88,0.08)",
    borderWidth: 0.5,
    borderColor: "rgba(48,209,88,0.2)",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center"
  },
  successCheck: { fontSize: 32, color: colors.green, marginBottom: 8 },
  successTitle: { fontSize: 17, fontWeight: "600", color: colors.label, marginBottom: 4 },
  successBody: { fontSize: 14, color: colors.label3, textAlign: "center" },

  // Support section
  supportCard: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden"
  },
  supportToggle: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  supportToggleText: { fontSize: 15, color: colors.label3 },
  supportToggleChevron: { fontSize: 14, color: colors.label4 },
  supportSep: { height: 0.5, backgroundColor: colors.separator },
  supportRow: { paddingHorizontal: 16, paddingVertical: 14 },
  supportRowText: { fontSize: 14, color: colors.blue }
});
