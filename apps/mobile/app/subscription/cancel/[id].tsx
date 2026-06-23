import { findServiceBySlug } from "@zeno/service-catalog";
import type { BillingCycle, CancellationDifficulty } from "@zeno/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, Animated, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSubscriptionStore } from "../../../src/data/subscription-store";
import { cancelNotificationsForSubscription } from "../../../src/notifications/notificationService";
import { formatMoney } from "../../../src/utils/format";
import { formatShortDate, getDaysRemaining, withAlpha } from "../../../src/utils/subscription-ui";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronUp, CircleCheck, ExternalLink, Mail, Phone, PiggyBank, Search, XCircle, type LucideIcon } from "lucide-react-native";
import { ServiceAvatar } from "../../../src/components/zeno";
import { useZenoTheme } from "../../../src/theme/theme-provider";
import type { ThemeTokens } from "../../../src/theme/tokens";
import { type as typography } from "../../../src/theme/typography";
import { fonts } from "../../../src/theme/zeno";
import { spacing } from "../../../src/theme/spacing";

// ─── Pure helpers (logic unchanged) ──────────────────────────────────────────

function getDifficultyMeta(difficulty: CancellationDifficulty, theme: ThemeTokens): { label: string; note: string; bg: string; border: string; color: string; Icon: LucideIcon } {
  if (difficulty === "easy")
    return {
      label: "Easy to cancel",
      note: "A couple of taps and you're done.",
      bg: theme.successSurface, border: withAlpha(theme.success, 0.2), color: theme.success, Icon: CheckCircle2
    };
  if (difficulty === "medium")
    return {
      label: "Moderate steps",
      note: "A few steps — follow them in order below.",
      bg: theme.warningSurface, border: withAlpha(theme.warning, 0.2), color: theme.warning, Icon: AlertTriangle
    };
  if (difficulty === "hard")
    return {
      label: "Hard to cancel",
      note: "This one buries the cancel option. Follow the steps carefully.",
      bg: theme.dangerSurface, border: withAlpha(theme.danger, 0.2), color: theme.danger, Icon: XCircle
    };
  return {
    label: "Dark pattern",
    note: "Known for hard-to-cancel flows — they'll try to stop you. Follow these steps and don't accept any \"stay\" offers.",
    bg: theme.dangerSurface, border: withAlpha(theme.danger, 0.25), color: theme.danger, Icon: AlertTriangle
  };
}

function getRenewalLabel(days: number | null, dateValue?: string): string {
  if (days === null) return `Next renewal date unknown`;
  if (days === 0) return `Renews TODAY — ${formatShortDate(dateValue)}`;
  if (days === 1) return `Renews tomorrow — ${formatShortDate(dateValue)}`;
  return `Renews in ${days} days — ${formatShortDate(dateValue)}`;
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SubscriptionCancelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { subscriptions, requestCancellation } = useSubscriptionStore();
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
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft size={22} color={theme.primary} strokeWidth={2} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>
          <View style={styles.notFoundWrap}>
            <Text style={styles.notFoundText}>Subscription not found</Text>
            <Pressable accessibilityRole="button" style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const sub = subscription;
  const service = sub.serviceSlug ? findServiceBySlug(sub.serviceSlug) : undefined;
  const difficulty = service?.cancellationDifficulty ? getDifficultyMeta(service.cancellationDifficulty, theme) : null;
  const annualMinor = getAnnualAmountMinor(sub.price.amountMinor, sub.billingCycle);
  const daysRemaining = getDaysRemaining(sub.nextRenewalDate);
  const renewalLabel = getRenewalLabel(daysRemaining, sub.nextRenewalDate);
  const steps = service?.cancellationGuideSteps?.length
    ? service.cancellationGuideSteps
    : getGenericSteps(sub.name);
  const cancelUrl = service?.cancellationUrl ?? service?.website;

  async function handleOpenCancelPage() {
    if (!cancelUrl) {
      // No URL to open — still guide the user to confirm once they've cancelled elsewhere.
      setCurrentStep(1);
      setShowConfirm(true);
      return;
    }
    try {
      await Linking.openURL(cancelUrl);
    } catch {
      Alert.alert("Couldn't open the page", "Open your browser and go to the service's account or billing settings to cancel.");
    }
    setCurrentStep(1);
    setShowConfirm(true);
  }

  async function handleConfirmedCancel() {
    // CHANGE 4: self-report moves the sub to "pending verification", not
    // straight to "cancelled". Zeno re-checks around the next renewal date.
    requestCancellation(sub.id);
    await cancelNotificationsForSubscription(sub.id);
    setCancelSuccess(true);
    const message = `${sub.name} marked cancelled — we'll verify it stopped.`;
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.LONG);
      router.replace("/dashboard");
    } else {
      Alert.alert("Pending verification", message, [
        { text: "OK", onPress: () => router.replace("/dashboard") }
      ]);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ backgroundColor: theme.background }}
        >
          {/* Nav bar */}
          <View style={styles.navBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft size={22} color={theme.primary} strokeWidth={2} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.navTitle}>Cancel subscription</Text>
          </View>

          {/* Service hero */}
          <View style={styles.hero}>
            <View style={{ marginBottom: 16 }}>
              <ServiceAvatar name={sub.name} size={72} />
            </View>
            <Text style={styles.heroName}>{sub.name}</Text>
            <Text style={styles.heroMeta}>
              {formatMoney(sub.price.amountMinor, sub.price.currency)} · {sub.billingCycle}
            </Text>
            <Text style={[
              styles.heroRenewal,
              daysRemaining !== null && daysRemaining <= 3 ? { color: theme.danger }
                : daysRemaining !== null && daysRemaining <= 7 ? { color: theme.warning }
                : null
            ]}>
              {renewalLabel}
            </Text>
          </View>

          {/* Savings card */}
          {annualMinor > 0 ? (
            <View style={styles.savingsCard}>
              <View style={styles.savingsIcon} accessible={false} importantForAccessibility="no-hide-descendants">
                <PiggyBank size={18} color={theme.success} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savingsLabel}>Cancelling saves you</Text>
              </View>
              <Text style={styles.savingsAmount}>
                {formatMoney(annualMinor, sub.price.currency)}/yr
              </Text>
            </View>
          ) : null}

          {/* Difficulty badge + plain-language note */}
          {difficulty ? (
            <View
              style={[styles.difficultyCard, { backgroundColor: difficulty.bg, borderColor: difficulty.border }]}
              accessibilityLabel={`${difficulty.label}. ${difficulty.note}`}
            >
              <View style={styles.difficultyHeader}>
                <difficulty.Icon size={15} color={difficulty.color} strokeWidth={2} />
                <Text style={[styles.difficultyText, { color: difficulty.color }]}>{difficulty.label}</Text>
              </View>
              <Text style={styles.difficultyNote}>{difficulty.note}</Text>
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
                      <Check size={12} color={theme.onPrimary} strokeWidth={3} />
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

          {/* Primary CTA: open the service's cancellation page */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelUrl ? `Open ${sub.name} cancellation page` : `Cancel ${sub.name} subscription`}
            accessibilityHint={cancelUrl ? "Opens the service's cancellation page in your browser" : undefined}
            style={styles.ctaButton}
            onPress={() => void handleOpenCancelPage()}
          >
            {cancelUrl ? <ExternalLink size={16} color={theme.background} strokeWidth={2} /> : null}
            <Text style={styles.ctaText}>{cancelUrl ? "Open cancellation page" : "Cancel subscription"}</Text>
          </Pressable>

          {/* Direct "already cancelled" path — always reachable */}
          {!showConfirm ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mark ${sub.name} as cancelled`}
              accessibilityHint="Marks this subscription cancelled and clears its renewal reminders"
              style={styles.markCancelledBtn}
              onPress={() => void handleConfirmedCancel()}
            >
              <Text style={styles.markCancelledText}>I've already cancelled — mark as cancelled</Text>
            </Pressable>
          ) : null}

          {/* Confirm / Success section */}
          {showConfirm ? (
            cancelSuccess ? (
              <View style={styles.successCard}>
                <CircleCheck size={32} color={theme.success} strokeWidth={2} />
                <Text style={[styles.successTitle, { marginTop: 8 }]}>Pending verification</Text>
                <Text style={styles.successBody}>
                  We'll confirm there's no charge around {formatShortDate(sub.nextRenewalDate)}. If it stops, you save {formatMoney(annualMinor, sub.price.currency)}/year.
                </Text>
              </View>
            ) : (
              <Animated.View style={[styles.confirmCard, { opacity: confirmAnim, transform: [{ translateY: confirmSlide }] }]}>
                <Text style={styles.confirmTitle}>Did you cancel it?</Text>
                <View style={styles.confirmButtons}>
                  <Pressable accessibilityRole="button" style={styles.yesBtn} onPress={() => void handleConfirmedCancel()}>
                    <Text style={styles.yesBtnText}>Yes, I cancelled</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" style={styles.notYetBtn} onPress={() => setShowConfirm(false)}>
                    <Text style={styles.notYetBtnText}>Not yet</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )
          ) : null}

          {/* Support section */}
          <View style={styles.supportCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: supportOpen }}
              style={styles.supportToggle}
              onPress={() => setSupportOpen((o) => !o)}
            >
              <Text style={styles.supportToggleText}>Having trouble?</Text>
              {supportOpen ? <ChevronUp size={16} color={theme.quietText} strokeWidth={2} /> : <ChevronDown size={16} color={theme.quietText} strokeWidth={2} />}
            </Pressable>

            {supportOpen ? (
              <View>
                <View style={styles.supportSep} />
                {service?.supportContact?.email ? (
                  <Pressable accessibilityRole="button" style={styles.supportRow} onPress={() => void Linking.openURL(`mailto:${service.supportContact?.email}`)}>
                    <View style={styles.supportRowInner}>
                      <Mail size={16} color={theme.primary} strokeWidth={2} />
                      <Text style={styles.supportRowText}>Email support</Text>
                    </View>
                  </Pressable>
                ) : null}
                {service?.supportContact?.phone ? (
                  <>
                    {service.supportContact.email ? <View style={styles.supportSep} /> : null}
                    <Pressable accessibilityRole="button" style={styles.supportRow} onPress={() => void Linking.openURL(`tel:${service.supportContact?.phone}`)}>
                      <View style={styles.supportRowInner}>
                        <Phone size={16} color={theme.primary} strokeWidth={2} />
                        <Text style={styles.supportRowText}>Call support</Text>
                      </View>
                    </Pressable>
                  </>
                ) : null}
                <View style={styles.supportSep} />
                <Pressable
                  accessibilityRole="button"
                  style={styles.supportRow}
                  onPress={() => void Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(`how to cancel ${sub.name}`)}`)}
                >
                  <View style={styles.supportRowInner}>
                    <Search size={16} color={theme.primary} strokeWidth={2} />
                    <Text style={styles.supportRowText}>Search how to cancel {sub.name}</Text>
                  </View>
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

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 120, backgroundColor: theme.background },

    // Nav bar
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.screenH,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60, minHeight: 44 },
    backChevron: { color: theme.primary, fontSize: 22, lineHeight: 22 },
    backText: { color: theme.primary, fontSize: 17 },
    navTitle: {
      ...typography.headline,
      color: theme.text,
      position: "absolute",
      left: 60, right: 60,
      textAlign: "center"
    },

    // Not found
    notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    notFoundText: { ...typography.title3, color: theme.text, marginBottom: 16 },
    secondaryBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.surfaceAlt },
    secondaryBtnText: { ...typography.callout, fontWeight: "600", color: theme.text },

    // Hero
    hero: { alignItems: "center", paddingTop: 24, paddingBottom: 20, paddingHorizontal: spacing.screenH },
    heroAvatar: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    heroAvatarText: { fontSize: 28, fontWeight: "800" },
    heroName: { ...typography.title2, color: theme.text, letterSpacing: -0.5, textAlign: "center", marginBottom: 4 },
    heroMeta: { ...typography.footnote, color: theme.mutedText, textAlign: "center" },
    heroRenewal: { ...typography.footnote, fontWeight: "600", color: theme.text, textAlign: "center", marginTop: 4 },

    // Savings card
    savingsCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.successSurface,
      borderWidth: 0.5,
      borderColor: withAlpha(theme.success, 0.2),
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    savingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.successSurface, alignItems: "center", justifyContent: "center" },
    savingsIconText: { fontSize: 18, textAlign: "center", lineHeight: 36 },
    savingsLabel: { fontSize: 13, color: theme.success },
    savingsAmount: { fontSize: 17, fontWeight: "700", color: theme.success, fontVariant: ["tabular-nums"], letterSpacing: -0.5 },

    // Difficulty card
    difficultyCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 0.5,
      gap: 4
    },
    difficultyHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    difficultyText: { fontSize: 13, fontFamily: fonts.sans.bold, letterSpacing: -0.1 },
    difficultyNote: { fontSize: 13, lineHeight: 18, color: theme.mutedText },

    // Steps
    sectionLabel: { ...typography.sectionHeader, color: theme.mutedText, paddingHorizontal: spacing.screenH, paddingBottom: 12 },
    stepsList: { paddingHorizontal: spacing.screenH },
    stepRow: { flexDirection: "row", gap: 14, marginBottom: 16, alignItems: "flex-start" },
    stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
    stepCircleDone:    { backgroundColor: theme.success },
    stepCircleCurrent: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.mutedText },
    stepCircleUpcoming:{ backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.border },
    stepCheckText: { fontSize: 11, fontWeight: "700", color: theme.onPrimary, textAlign: "center", lineHeight: 26 },
    stepNumText: { fontSize: 11, fontWeight: "500", textAlign: "center", lineHeight: 22 },
    stepNumCurrent: { color: theme.text },
    stepNumUpcoming: { color: theme.quietText },
    stepText: { flex: 1, fontSize: 13, lineHeight: 20 },
    stepTextCurrent: { color: theme.text },
    stepTextMuted: { color: theme.mutedText },

    // CTA button
    ctaButton: {
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 8,
      backgroundColor: theme.text,
      borderRadius: 16,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    ctaArrow: { fontSize: 16, color: theme.background, lineHeight: 18 },
    ctaText: { fontSize: 16, fontWeight: "600", color: theme.background, letterSpacing: -0.2 },

    // Mark-as-cancelled (secondary path)
    markCancelledBtn: {
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 8,
      minHeight: 44,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceAlt
    },
    markCancelledText: { fontSize: 15, fontWeight: "600", color: theme.text, textAlign: "center" },

    // Confirm card
    confirmCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16
    },
    confirmTitle: { fontSize: 16, fontWeight: "600", color: theme.text, marginBottom: 16 },
    confirmButtons: { flexDirection: "row", gap: 12 },
    yesBtn: { flex: 1, minHeight: 44, justifyContent: "center", backgroundColor: theme.success, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
    yesBtnText: { fontSize: 15, fontWeight: "600", color: theme.onPrimary, textAlign: "center" },
    notYetBtn: { flex: 1, minHeight: 44, justifyContent: "center", backgroundColor: theme.surfaceAlt, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
    notYetBtnText: { fontSize: 15, fontWeight: "500", color: theme.mutedText, textAlign: "center" },

    // Success card
    successCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.successSurface,
      borderWidth: 0.5,
      borderColor: withAlpha(theme.success, 0.2),
      borderRadius: 16,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: "center"
    },
    successCheck: { fontSize: 32, color: theme.success, marginBottom: 8 },
    successTitle: { fontSize: 17, fontWeight: "600", color: theme.text, marginBottom: 4 },
    successBody: { fontSize: 14, color: theme.mutedText, textAlign: "center" },

    // Support section
    supportCard: {
      marginHorizontal: 16,
      marginTop: 4,
      backgroundColor: theme.card,
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
    supportToggleText: { fontSize: 15, color: theme.mutedText },
    supportToggleChevron: { fontSize: 14, color: theme.quietText },
    supportSep: { height: 0.5, backgroundColor: theme.border },
    supportRow: { paddingHorizontal: 16, paddingVertical: 14 },
    supportRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
    supportRowText: { fontSize: 14, color: theme.primary }
  });
}
