import { findServiceBySlug } from "@subradar/service-catalog";
import { Link, router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/auth/authStore";
import { checkStatus, type BillingPlan } from "../../src/billing/revenueCat";
import { InsightCard } from "../../components/insights/InsightCard";
import { ThemeToggle } from "../../src/components/ui";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { generateInsights, getTotalSavingOpportunity } from "../../src/insights/insightsEngine";
import { formatMoney, notificationLabel } from "../../src/notifications/renewal-reminders";
import { colors } from "../../src/theme/colors";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

const DAY_MS = 24 * 60 * 60 * 1000;
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

function getDaysRemaining(dateValue?: string | null): number | null {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.max(0, Math.ceil((targetUTC - todayUTC) / DAY_MS));
}

function formatRenewalDate(dateValue?: string | null): string {
  if (!dateValue) return "No date";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getAvatarStyle(category: string) {
  const map: Record<string, { bg: string; text: string }> = {
    entertainment:    { bg: "rgba(255,69,58,0.15)",    text: "#FF453A" },
    streaming:        { bg: "rgba(255,69,58,0.15)",    text: "#FF453A" },
    ai_tools:         { bg: "rgba(191,90,242,0.15)",   text: "#BF5AF2" },
    developer_tools:  { bg: "rgba(191,90,242,0.15)",   text: "#BF5AF2" },
    productivity:     { bg: "rgba(10,132,255,0.15)",   text: "#0A84FF" },
    gaming:           { bg: "rgba(48,209,88,0.15)",    text: "#30D158" },
    health:           { bg: "rgba(255,159,10,0.15)",   text: "#FF9F0A" },
    finance:          { bg: "rgba(90,200,245,0.15)",   text: "#5AC8F5" },
    education:        { bg: "rgba(255,214,10,0.15)",   text: "#FFD60A" },
    music:            { bg: "rgba(255,55,95,0.15)",    text: "#FF375F" },
    family:           { bg: "rgba(48,209,88,0.15)",    text: "#30D158" },
  };
  return map[category] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)" };
}

function getUrgencyBadge(days: number | null): { bg: string; text: string; label: string } | null {
  if (days === null) return null;
  if (days === 0)  return { bg: "rgba(255,69,58,0.2)",    text: "#FF453A",              label: "TODAY"     };
  if (days <= 3)   return { bg: "rgba(255,69,58,0.15)",   text: "#FF6961",              label: `${days} days` };
  if (days <= 7)   return { bg: "rgba(255,159,10,0.15)",  text: colors.orange,          label: `${days} days` };
  return             { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.3)", label: `${days} days` };
}

function insightAccent(type: string): string {
  if (type === "unused_review")       return colors.orange;
  if (type === "duplicate_category")  return colors.blue;
  if (type === "annual_savings")      return colors.green;
  if (type === "trial_ending")        return colors.red;
  return colors.purple;
}

function canAccessFeature(plan: BillingPlan, minimumPlan: BillingPlan): boolean {
  if (minimumPlan === "free")   return true;
  if (minimumPlan === "pro")    return plan === "pro" || plan === "family";
  return plan === "family";
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
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
            <View style={styles.avatarCircle}>
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
                <View style={styles.urgentIcon}>
                  <Text style={styles.urgentIconText}>⚠</Text>
                </View>
                <View style={styles.urgentMiddle}>
                  <Text style={styles.urgentTitle}>
                    {urgentRenewal.sub.name} renews in{" "}
                    {urgentRenewal.days === 0 ? "TODAY" : `${urgentRenewal.days} days`}
                  </Text>
                  <Text style={styles.urgentSubtitle}>
                    {formatMoney(urgentRenewal.sub.price.amountMinor, urgentRenewal.sub.price.currency)}
                    {urgentRenewal.sub.serviceSlug
                      ? ` · ${(findServiceBySlug(urgentRenewal.sub.serviceSlug)?.cancellationDifficulty ?? "medium").replace("_", " ")} cancellation`
                      : " · medium cancellation"}
                  </Text>
                </View>
                <Pressable
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
          <View style={styles.groupCard}>
            {upcoming.slice(0, 5).map((sub, index) => {
              const avatar = getAvatarStyle(sub.category);
              const days = getDaysRemaining(sub.nextRenewalDate);
              const badge = getUrgencyBadge(days);
              const isLast = index === Math.min(upcoming.length, 5) - 1;
              return (
                <Link href={`/subscription/${sub.id}` as never} key={sub.id} asChild>
                  <Pressable>
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
            {upcoming.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No upcoming renewals</Text>
              </View>
            ) : null}
          </View>

          {/* ── Insights preview ── */}
          {allInsights.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelMargin]}>INSIGHTS</Text>
              {savingOpportunity > 20 ? (
                <Pressable style={styles.savingCallout} onPress={() => router.push("/analytics")}>
                  <Text style={styles.savingCalloutText}>
                    You could save ${savingOpportunity.toFixed(0)}/mo — tap to see how
                  </Text>
                </Pressable>
              ) : null}
              {previewInsights.map((insight) => (
                <View key={insight.id} style={styles.insightCard}>
                  <View style={[styles.insightAccentBar, { backgroundColor: insightAccent(insight.type) }]} />
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightBody}>{insight.message}</Text>
                    {insight.actionLabel ? (
                      <Pressable onPress={() => router.push("/analytics")}>
                        <Text style={styles.insightAction}>{insight.actionLabel}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Pressable onPress={() => setDismissedInsights((c) => [...c, insight.id])}>
                    <Text style={styles.insightDismiss}>×</Text>
                  </Pressable>
                </View>
              ))}
              <Link href="/analytics" asChild>
                <Pressable style={styles.seeAllRow}>
                  <Text style={styles.seeAllText}>See all {allInsights.length} insights</Text>
                  <Text style={styles.seeAllChevron}>›</Text>
                </Pressable>
              </Link>
            </>
          ) : null}

          {/* ── Spend coach ── */}
          <View style={styles.coachCard}>
            <View style={styles.coachIcon}>
              <Text style={styles.coachIconText}>AI</Text>
            </View>
            <Text style={styles.coachTitle}>Spend coach</Text>
            <Text style={styles.coachBody}>
              {spendSummary.insights[0]?.body ??
                `You spend ${formatMoney(totalMonthlyMinor)} per month. Review AI and productivity tools first.`}
            </Text>
            <Link href="/coach" asChild>
              <Pressable style={styles.coachBtn}>
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
                    onPress={() => router.push((locked ? "/paywall" : feature.href) as never)}
                    style={[styles.featurePill, locked ? styles.featurePillLocked : styles.featurePillActive]}
                  >
                    <Text style={[styles.featurePillText, { color: locked ? colors.orange : colors.blue }]}>
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
            <Link href="/discovery" asChild>
              <Pressable style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Scan for subscriptions</Text>
              </Pressable>
            </Link>
            <Link href="/subscription/add" asChild>
              <Pressable style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Add manually</Text>
              </Pressable>
            </Link>
          </View>

          {/* ── Settings link ── */}
          <Link href="/settings" asChild>
            <Pressable style={styles.settingsLink}>
              <Text style={styles.settingsLinkText}>Settings and security</Text>
            </Pressable>
          </Link>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scroll: {
    backgroundColor: colors.bg
  },
  scrollContent: {
    paddingBottom: 100,
    backgroundColor: colors.bg
  },

  // Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.bg
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.label,
    letterSpacing: -1.5
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarCircleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff"
  },

  // Hero
  hero: {
    paddingHorizontal: spacing.screenH,
    paddingTop: 8,
    paddingBottom: 28
  },
  heroLabel: {
    ...typography.sectionHeader,
    color: colors.label3,
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
    color: colors.label3,
    marginTop: 8
  },
  heroWhole: {
    fontSize: 52,
    fontWeight: "700",
    color: colors.label,
    letterSpacing: -2.5
  },
  heroDecimal: {
    fontSize: 28,
    fontWeight: "300",
    color: colors.label3,
    letterSpacing: -1
  },
  heroSubtitle: {
    ...typography.footnote,
    color: colors.label3,
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
    borderColor: "rgba(10,132,255,0.24)",
    backgroundColor: "rgba(10,132,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  freeCounterText: {
    ...typography.footnote,
    fontWeight: "600",
    color: colors.blue
  },
  freeCounterMeta: {
    ...typography.caption2,
    color: colors.label3
  },

  // Urgent alert card
  urgentCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden"
  },
  urgentAccentBar: {
    height: 3,
    flexDirection: "row"
  },
  urgentAccentLeft: {
    flex: 1,
    backgroundColor: colors.red
  },
  urgentAccentRight: {
    flex: 1,
    backgroundColor: colors.orange
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
    backgroundColor: "rgba(255,69,58,0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  urgentIconText: {
    fontSize: 18,
    color: colors.red
  },
  urgentMiddle: {
    flex: 1
  },
  urgentTitle: {
    ...typography.headline,
    color: colors.label
  },
  urgentSubtitle: {
    ...typography.footnote,
    color: colors.label3,
    marginTop: 2
  },
  urgentCancelBtn: {
    backgroundColor: colors.red,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  urgentCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff"
  },

  // Section label
  sectionLabel: {
    ...typography.sectionHeader,
    color: colors.label3,
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
    backgroundColor: colors.surface,
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
    color: colors.label
  },
  rowMeta: {
    ...typography.caption1,
    color: colors.label3,
    marginTop: 1
  },
  rowRight: {
    alignItems: "flex-end"
  },
  rowPrice: {
    ...typography.subheadline,
    fontWeight: "500",
    color: colors.label,
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
    backgroundColor: colors.separator
  },
  emptyRow: {
    padding: 16,
    alignItems: "center"
  },
  emptyText: {
    ...typography.callout,
    color: colors.label3
  },

  // Saving callout
  savingCallout: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: spacing.groupRadius,
    borderWidth: 0.5,
    borderColor: "rgba(48,209,88,0.3)",
    backgroundColor: "rgba(48,209,88,0.12)",
    padding: 12
  },
  savingCalloutText: {
    ...typography.footnote,
    fontWeight: "600",
    color: colors.green,
    lineHeight: 18
  },

  // Insight card
  insightCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
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
    color: colors.label
  },
  insightBody: {
    ...typography.footnote,
    color: colors.label3,
    marginTop: 4,
    lineHeight: 18
  },
  insightAction: {
    ...typography.footnote,
    fontWeight: "600",
    color: colors.blue,
    marginTop: 8
  },
  insightDismiss: {
    fontSize: 20,
    color: colors.label4,
    padding: 4
  },

  // See all
  seeAllRow: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: spacing.groupRadius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  seeAllText: {
    ...typography.subheadline,
    color: colors.blue,
    flex: 1
  },
  seeAllChevron: {
    fontSize: 18,
    color: colors.label4
  },

  // Coach card
  coachCard: {
    marginHorizontal: 16,
    marginTop: 28,
    backgroundColor: colors.surface,
    borderRadius: spacing.groupRadius,
    padding: spacing.innerPad,
    overflow: "hidden"
  },
  coachIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(10,132,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  coachIconText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.blue
  },
  coachTitle: {
    ...typography.title3,
    color: colors.label,
    marginBottom: 6
  },
  coachBody: {
    ...typography.callout,
    color: colors.label2,
    lineHeight: 22
  },
  coachBtn: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: colors.blue,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  coachBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff"
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
    borderColor: "rgba(10,132,255,0.22)",
    backgroundColor: "rgba(10,132,255,0.08)"
  },
  featurePillLocked: {
    borderColor: "rgba(255,159,10,0.28)",
    backgroundColor: "rgba(255,159,10,0.10)"
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
    backgroundColor: colors.orange
  },
  reminderText: {
    ...typography.footnote,
    color: colors.label3,
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
    backgroundColor: colors.blue,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center"
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff"
  },
  secondaryBtn: {
    backgroundColor: colors.fillSecondary,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center"
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.blue
  },

  // Settings link
  settingsLink: {
    alignItems: "center",
    paddingVertical: 16
  },
  settingsLinkText: {
    ...typography.footnote,
    fontWeight: "600",
    color: colors.blue
  }
});
