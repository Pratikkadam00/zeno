import { findServiceBySlug } from "@subradar/service-catalog";
import { Link, router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/auth/authStore";
import { checkStatus, type BillingPlan } from "../../src/billing/revenueCat";
import { ThemeToggle } from "../../src/components/ui";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { generateInsights, getTotalSavingOpportunity } from "../../src/insights/insightsEngine";
import { formatMoney, notificationLabel } from "../../src/utils/format";
import { formatDaysLabel, formatRenewalDate, getAvatarStyle, getDaysRemaining, getUrgencyBadge, withAlpha } from "../../src/utils/subscription-ui";
import { useSubRadarTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

const FREE_LIMIT = 8;

const intelligenceFeatures = [
  { href: "/spend-twin",   label: "Spend Twin",          minimumPlan: "pro"    },
  { href: "/analytics",    label: "Analytics Dashboard", minimumPlan: "pro"    },
  { href: "/family",       label: "Family Vault",        minimumPlan: "family" },
  { href: "/widgets",      label: "Widgets + Watch",     minimumPlan: "pro"    },
  { href: "/business",     label: "Business Tier",       minimumPlan: "pro"    },
  { href: "/public-api",   label: "Public API",          minimumPlan: "pro"    },
  { href: "/partners",     label: "Partners",            minimumPlan: "pro"    },
  { href: "/backend",      label: "Backend Connection",  minimumPlan: "free"   }
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function insightAccent(type: string, theme: ThemeTokens): string {
  if (type === "unused_review")       return theme.warning;
  if (type === "duplicate_category")  return theme.primary;
  if (type === "annual_savings")      return theme.success;
  if (type === "trial_ending")        return theme.danger;
  return theme.secondary;
}

function canAccessFeature(plan: BillingPlan, minimumPlan: BillingPlan): boolean {
  if (minimumPlan === "free")   return true;
  if (minimumPlan === "pro")    return plan === "pro" || plan === "family";
  return plan === "family";
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { theme } = useSubRadarTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { subscriptions, totalMonthlyMinor, upcoming, spendSummary, reminderPlan } = useSubscriptionStore();
  const { plan, setPlan } = useAuthStore();
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);

  const allInsights = useMemo(() => generateInsights(subscriptions), [subscriptions]);
  const savingOpportunity = getTotalSavingOpportunity(allInsights);
  const previewInsights = allInsights
    .filter((i) => i.type !== "spend_summary")
    .filter((i) => !dismissedInsights.includes(i.id))
    .slice(0, 2);

  // Hero amount split
  const [wholeAmount, decimalAmount] = (totalMonthlyMinor / 100).toFixed(2).split(".");

  // Subscriptions renewing this week
  const renewingThisWeek = upcoming.filter((s) => {
    const d = getDaysRemaining(s.nextRenewalDate);
    return d !== null && d >= 0 && d <= 7;
  });

  // Urgent renewal (nearest ≤3 days)
  const urgentRenewal = useMemo(() => {
    const urgent = upcoming
      .map((s) => ({ sub: s, days: getDaysRemaining(s.nextRenewalDate) }))
      .filter(({ days }) => days !== null && days <= 3)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
    return urgent[0] ?? null;
  }, [upcoming]);

  useEffect(() => {
    let mounted = true;
    void checkStatus()
      .then((next) => { if (mounted) setPlan(next); })
      .catch(() => { if (mounted) setPlan("free"); });
    return () => { mounted = false; };
  }, [setPlan]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >

          {/* ── Nav bar ── */}
          <View style={styles.navBar}>
            <Text style={styles.brand}>zeno</Text>
            <View style={styles.avatarCircle} importantForAccessibility="no-hide-descendants" accessible={false}>
              <Text style={styles.avatarCircleText}>Z</Text>
            </View>
          </View>

          {/* ── Hero ── */}
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>MONTHLY SPEND</Text>
            <View style={styles.heroAmount}>
              <Text style={styles.heroCurrency}>$</Text>
              <Text style={styles.heroWhole}>{wholeAmount}</Text>
              <Text style={styles.heroDecimal}>.{decimalAmount}</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              {subscriptions.length} subscriptions · {renewingThisWeek.length} renewing this week
            </Text>
          </View>

          {/* ── Free tier counter ── */}
          {plan === "free" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Free tier: ${subscriptions.length} of ${FREE_LIMIT} subscriptions used`}
              onPress={() => { if (subscriptions.length >= FREE_LIMIT) router.push("/paywall"); }}
              style={styles.freeCounter}
            >
              <Text style={styles.freeCounterText}>
                {subscriptions.length}/{FREE_LIMIT} subscriptions
              </Text>
              <Text style={styles.freeCounterMeta}>Free tier</Text>
            </Pressable>
          ) : null}

          {/* ── Urgent alert card ── */}
          {urgentRenewal ? (
            <View style={styles.urgentCard}>
              <View style={styles.urgentAccentBar}>
                <View style={styles.urgentAccentLeft} />
                <View style={styles.urgentAccentRight} />
              </View>
              <View style={styles.urgentBody}>
                <View style={styles.urgentIcon} accessible={false} importantForAccessibility="no-hide-descendants">
                  <Text style={styles.urgentIconText}>⚠</Text>
                </View>
                <View style={styles.urgentMiddle}>
                  <Text style={styles.urgentTitle}>
                    {urgentRenewal.sub.name} renews{urgentRenewal.days === 0 ? " " : " in "}
                    {formatDaysLabel(urgentRenewal.days)}
                  </Text>
                  <Text style={styles.urgentSubtitle}>
                    {formatMoney(urgentRenewal.sub.price.amountMinor, urgentRenewal.sub.price.currency)}
                    {urgentRenewal.sub.serviceSlug
                      ? ` · ${(findServiceBySlug(urgentRenewal.sub.serviceSlug)?.cancellationDifficulty ?? "medium").replace("_", " ")} cancellation`
                      : " · medium cancellation"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel ${urgentRenewal.sub.name}`}
                  style={styles.urgentCancelBtn}
                  onPress={() => router.push(`/subscription/cancel/${urgentRenewal.sub.id}` as never)}
                >
                  <Text style={styles.urgentCancelText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* ── Upcoming renewals ── */}
          <Text style={styles.sectionLabel}>UPCOMING RENEWALS</Text>
          {upcoming.length === 0 ? (
            /* ── Empty state ── */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap} accessible={false} importantForAccessibility="no-hide-descendants">
                <Text style={styles.emptyIcon}>🗓️</Text>
              </View>
              <Text style={styles.emptyTitle}>No upcoming renewals</Text>
              <Text style={styles.emptyBody}>
                Once you track subscriptions, their next charges show up here so you're never surprised.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.emptyPrimaryBtn}
                onPress={() => router.push("/discover")}
              >
                <Text style={styles.emptyPrimaryBtnText}>Find my subscriptions</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.emptySecondaryBtn}
                onPress={() => router.push("/subscription/add")}
              >
                <Text style={styles.emptySecondaryBtnText}>Add one manually</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.groupCard}>
              {upcoming.slice(0, 5).map((sub, index) => {
                const avatar = getAvatarStyle(sub.category, theme);
                const days = getDaysRemaining(sub.nextRenewalDate);
                const badge = getUrgencyBadge(days, theme);
                const isLast = index === Math.min(upcoming.length, 5) - 1;
                return (
                  <Link href={`/subscription/${sub.id}` as never} key={sub.id} asChild>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${sub.name}, ${formatMoney(sub.price.amountMinor, sub.price.currency)}, renews ${formatRenewalDate(sub.nextRenewalDate)}`}>
                      <View style={styles.row}>
                        <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                          <Text style={[styles.avatarText, { color: avatar.text }]}>
                            {sub.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.rowMiddle}>
                          <Text style={styles.rowTitle}>{sub.name}</Text>
                          <Text style={styles.rowMeta}>
                            {formatRenewalDate(sub.nextRenewalDate)} · {sub.billingCycle}
                          </Text>
                        </View>
                        <View style={styles.rowRight}>
                          <Text style={styles.rowPrice}>
                            {formatMoney(sub.price.amountMinor, sub.price.currency)}
                          </Text>
                          {badge ? (
                            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      {!isLast ? <View style={styles.separator} /> : null}
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          )}

          {/* ── Insights preview ── */}
          {allInsights.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelMargin]}>INSIGHTS</Text>
              {savingOpportunity > 20 ? (
                <Pressable accessibilityRole="button" style={styles.savingCallout} onPress={() => router.push("/analytics")}>
                  <Text style={styles.savingCalloutText}>
                    You could save ${savingOpportunity.toFixed(0)}/mo — tap to see how
                  </Text>
                </Pressable>
              ) : null}
              {previewInsights.map((insight) => (
                <View key={insight.id} style={styles.insightCard}>
                  <View style={[styles.insightAccentBar, { backgroundColor: insightAccent(insight.type, theme) }]} />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightBody}>{insight.message}</Text>
                    {insight.actionLabel ? (
                      <Pressable accessibilityRole="button" onPress={() => router.push("/analytics")}>
                        <Text style={styles.insightAction}>{insight.actionLabel}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss insight"
                    hitSlop={10}
                    onPress={() => setDismissedInsights((c) => [...c, insight.id])}
                  >
                    <Text style={styles.insightDismiss}>×</Text>
                  </Pressable>
                </View>
              ))}
              <Link href="/analytics" asChild>
                <Pressable accessibilityRole="link" style={styles.seeAllRow}>
                  <Text style={styles.seeAllText}>See all {allInsights.length} insights</Text>
                  <Text style={styles.seeAllChevron} accessible={false}>›</Text>
                </Pressable>
              </Link>
            </>
          ) : null}

          {/* ── Spend coach ── */}
          <View style={styles.coachCard}>
            <View style={styles.coachIcon} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={styles.coachIconText}>AI</Text>
            </View>
            <Text style={styles.coachTitle}>Spend coach</Text>
            <Text style={styles.coachBody}>
              {spendSummary.insights[0]?.body ??
                `You spend ${formatMoney(totalMonthlyMinor)} per month. Review AI and productivity tools first.`}
            </Text>
            <Link href="/coach" asChild>
              <Pressable accessibilityRole="button" style={styles.coachBtn}>
                <Text style={styles.coachBtnText}>Open spend coach</Text>
              </Pressable>
            </Link>
          </View>

          {/* ── Intelligence suite ── */}
          <View style={styles.groupCard}>
            <Text style={[styles.sectionLabel, styles.sectionLabelInCard]}>INTELLIGENCE SUITE</Text>
            <View style={styles.pillGrid}>
              {intelligenceFeatures.map((feature) => {
                const locked = !canAccessFeature(plan, feature.minimumPlan);
                return (
                  <Pressable
                    key={feature.href}
                    accessibilityRole="button"
                    accessibilityLabel={locked ? `${feature.label}, locked, upgrade to unlock` : feature.label}
                    onPress={() => router.push((locked ? "/paywall" : feature.href) as never)}
                    style={[styles.featurePill, locked ? styles.featurePillLocked : styles.featurePillActive]}
                  >
                    <Text style={[styles.featurePillText, { color: locked ? theme.warning : theme.primary }]}>
                      {locked ? "🔒 " : ""}{feature.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Reminder plan ── */}
          {reminderPlan.length > 0 ? (
            <View style={styles.groupCard}>
              <Text style={[styles.sectionLabel, styles.sectionLabelInCard]}>UPCOMING REMINDERS</Text>
              {reminderPlan.slice(0, 4).map((plan, index) => {
                const isLast = index === Math.min(reminderPlan.length, 4) - 1;
                return (
                  <View key={`${plan.subscriptionId}-${plan.kind}`}>
                    <View style={styles.reminderRow}>
                      <View style={styles.reminderDot} />
                      <Text style={styles.reminderText}>
                        {notificationLabel(plan.kind)} — {plan.serviceName} — {new Date(plan.triggerAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {!isLast ? <View style={styles.separator} /> : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* ── Theme toggle ── */}
          <View style={styles.themeToggleWrap}>
            <ThemeToggle />
          </View>

          {/* ── Primary actions ── */}
          <View style={styles.actionsRow}>
            <Link href="/discover" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Scan for subscriptions</Text>
              </Pressable>
            </Link>
            <Link href="/subscription/add" asChild>
              <Pressable accessibilityRole="button" style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Add manually</Text>
              </Pressable>
            </Link>
          </View>

          {/* ── Settings link ── */}
          <Link href="/settings" asChild>
            <Pressable accessibilityRole="link" style={styles.settingsLink}>
              <Text style={styles.settingsLinkText}>Settings and security</Text>
            </Pressable>
          </Link>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background
    },
    scroll: {
      backgroundColor: theme.background
    },
    scrollContent: {
      paddingBottom: 100,
      backgroundColor: theme.background
    },

    // Nav bar
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.screenH,
      paddingTop: 16,
      paddingBottom: 8,
      backgroundColor: theme.background
    },
    brand: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -1.5
    },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary,
      alignItems: "center",
      justifyContent: "center"
    },
    avatarCircleText: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.onPrimary
    },

    // Hero
    hero: {
      paddingHorizontal: spacing.screenH,
      paddingTop: 8,
      paddingBottom: 28
    },
    heroLabel: {
      ...typography.sectionHeader,
      color: theme.mutedText,
      marginBottom: 8
    },
    heroAmount: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 2
    },
    heroCurrency: {
      fontSize: 22,
      fontWeight: "300",
      color: theme.mutedText,
      marginTop: 8
    },
    heroWhole: {
      fontSize: 52,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -2.5
    },
    heroDecimal: {
      fontSize: 28,
      fontWeight: "300",
      color: theme.mutedText,
      letterSpacing: -1
    },
    heroSubtitle: {
      ...typography.footnote,
      color: theme.mutedText,
      marginTop: 6
    },

    // Free counter
    freeCounter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      marginHorizontal: spacing.screenH,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: withAlpha(theme.primary, 0.24),
      backgroundColor: theme.primarySurface,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7
    },
    freeCounterText: {
      ...typography.footnote,
      fontWeight: "600",
      color: theme.primary
    },
    freeCounterMeta: {
      ...typography.caption2,
      color: theme.mutedText
    },

    // Urgent alert card
    urgentCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: "hidden"
    },
    urgentAccentBar: {
      height: 3,
      flexDirection: "row"
    },
    urgentAccentLeft: {
      flex: 1,
      backgroundColor: theme.danger
    },
    urgentAccentRight: {
      flex: 1,
      backgroundColor: theme.warning
    },
    urgentBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14
    },
    urgentIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.dangerSurface,
      alignItems: "center",
      justifyContent: "center"
    },
    urgentIconText: {
      fontSize: 18,
      color: theme.danger
    },
    urgentMiddle: {
      flex: 1
    },
    urgentTitle: {
      ...typography.headline,
      color: theme.text
    },
    urgentSubtitle: {
      ...typography.footnote,
      color: theme.mutedText,
      marginTop: 2
    },
    urgentCancelBtn: {
      backgroundColor: theme.danger,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7
    },
    urgentCancelText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.onPrimary
    },

    // Section label
    sectionLabel: {
      ...typography.sectionHeader,
      color: theme.mutedText,
      paddingHorizontal: spacing.screenH,
      paddingBottom: 8
    },
    sectionLabelMargin: {
      marginTop: 28
    },
    sectionLabelInCard: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      marginTop: 0
    },

    // Grouped card
    groupCard: {
      marginHorizontal: 16,
      backgroundColor: theme.card,
      borderRadius: spacing.groupRadius,
      overflow: "hidden"
    },

    // Row
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      minHeight: spacing.rowH + 8
    },
    avatar: {
      width: spacing.avatarMd,
      height: spacing.avatarMd,
      borderRadius: spacing.avatarRadius.md,
      alignItems: "center",
      justifyContent: "center"
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "700"
    },
    rowMiddle: {
      flex: 1
    },
    rowTitle: {
      ...typography.subheadline,
      color: theme.text
    },
    rowMeta: {
      ...typography.caption1,
      color: theme.mutedText,
      marginTop: 1
    },
    rowRight: {
      alignItems: "flex-end"
    },
    rowPrice: {
      ...typography.subheadline,
      fontWeight: "500",
      color: theme.text,
      fontVariant: ["tabular-nums"]
    },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 3
    },
    badgeText: {
      ...typography.caption1
    },
    separator: {
      position: "absolute",
      left: 66,
      right: 0,
      bottom: 0,
      height: 0.5,
      backgroundColor: theme.border
    },

    // Empty state
    emptyCard: {
      marginHorizontal: 16,
      backgroundColor: theme.card,
      borderRadius: spacing.groupRadius,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: "center"
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: theme.primarySurface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14
    },
    emptyIcon: {
      fontSize: 26
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.text,
      letterSpacing: -0.3,
      marginBottom: 6
    },
    emptyBody: {
      ...typography.footnote,
      color: theme.mutedText,
      textAlign: "center",
      lineHeight: 19,
      marginBottom: 18
    },
    emptyPrimaryBtn: {
      alignSelf: "stretch",
      minHeight: 48,
      backgroundColor: theme.primary,
      borderRadius: theme.radius,
      alignItems: "center",
      justifyContent: "center"
    },
    emptyPrimaryBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.onPrimary
    },
    emptySecondaryBtn: {
      alignSelf: "stretch",
      minHeight: 44,
      marginTop: 8,
      alignItems: "center",
      justifyContent: "center"
    },
    emptySecondaryBtnText: {
      ...typography.footnote,
      fontWeight: "600",
      color: theme.primary
    },

    // Saving callout
    savingCallout: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: spacing.groupRadius,
      borderWidth: 0.5,
      borderColor: withAlpha(theme.success, 0.3),
      backgroundColor: theme.successSurface,
      padding: 12
    },
    savingCalloutText: {
      ...typography.footnote,
      fontWeight: "600",
      color: theme.success,
      lineHeight: 18
    },

    // Insight card
    insightCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: theme.card,
      borderRadius: spacing.groupRadius,
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      overflow: "hidden"
    },
    insightAccentBar: {
      width: 3,
      alignSelf: "stretch",
      borderRadius: 2
    },
    insightContent: {
      flex: 1
    },
    insightTitle: {
      ...typography.subheadline,
      fontWeight: "600",
      color: theme.text
    },
    insightBody: {
      ...typography.footnote,
      color: theme.mutedText,
      marginTop: 4,
      lineHeight: 18
    },
    insightAction: {
      ...typography.footnote,
      fontWeight: "600",
      color: theme.primary,
      marginTop: 8
    },
    insightDismiss: {
      fontSize: 20,
      color: theme.quietText,
      padding: 4
    },

    // See all
    seeAllRow: {
      marginHorizontal: 16,
      marginTop: 4,
      backgroundColor: theme.card,
      borderRadius: spacing.groupRadius,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center"
    },
    seeAllText: {
      ...typography.subheadline,
      color: theme.primary,
      flex: 1
    },
    seeAllChevron: {
      fontSize: 18,
      color: theme.quietText
    },

    // Coach card
    coachCard: {
      marginHorizontal: 16,
      marginTop: 28,
      backgroundColor: theme.card,
      borderRadius: spacing.groupRadius,
      padding: spacing.innerPad,
      overflow: "hidden"
    },
    coachIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primarySurface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12
    },
    coachIconText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.primary
    },
    coachTitle: {
      ...typography.title3,
      color: theme.text,
      marginBottom: 6
    },
    coachBody: {
      ...typography.callout,
      color: theme.mutedText,
      lineHeight: 22
    },
    coachBtn: {
      alignSelf: "flex-start",
      marginTop: 14,
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 10
    },
    coachBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.onPrimary
    },

    // Intelligence suite pills
    pillGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 14
    },
    featurePill: {
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 0.5
    },
    featurePillActive: {
      borderColor: withAlpha(theme.primary, 0.22),
      backgroundColor: theme.primarySurface
    },
    featurePillLocked: {
      borderColor: withAlpha(theme.warning, 0.28),
      backgroundColor: theme.warningSurface
    },
    featurePillText: {
      ...typography.footnote,
      fontWeight: "600"
    },

    // Reminders
    reminderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    reminderDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.warning
    },
    reminderText: {
      ...typography.footnote,
      color: theme.mutedText,
      flex: 1
    },

    // Theme toggle
    themeToggleWrap: {
      marginHorizontal: 16,
      marginTop: 28
    },

    // Actions
    actionsRow: {
      marginHorizontal: 16,
      marginTop: 16,
      gap: 12
    },
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center"
    },
    primaryBtnText: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.onPrimary
    },
    secondaryBtn: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center"
    },
    secondaryBtnText: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.primary
    },

    // Settings link
    settingsLink: {
      alignItems: "center",
      paddingVertical: 16
    },
    settingsLinkText: {
      ...typography.footnote,
      fontWeight: "600",
      color: theme.primary
    }
  });
}
