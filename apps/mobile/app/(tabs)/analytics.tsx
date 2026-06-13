import { monthlyAmount } from "@subradar/shared";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { generateInsights, getTotalSavingOpportunity } from "../../src/insights/insightsEngine";
import type { Insight } from "../../src/insights/insightsEngine";
import { formatMoney } from "../../src/utils/format";
import { formatShortDate, getAvatarStyle, getCategoryColor, getDaysRemaining, getUrgencyBadge, withAlpha } from "../../src/utils/subscription-ui";
import { useSubRadarTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function insightIconMeta(type: Insight["type"], theme: ThemeTokens): { bg: string; icon: string } {
  switch (type) {
    case "unused":                return { bg: theme.warningSurface, icon: "🕐" };
    case "duplicate":             return { bg: theme.primarySurface, icon: "🔄" };
    case "annual_saving":         return { bg: theme.successSurface, icon: "💰" };
    case "trial_ending":          return { bg: theme.dangerSurface,  icon: "⏰" };
    case "high_spend":            return { bg: theme.surfaceAlt,     icon: "📊" };
    case "cancellation_reminder": return { bg: theme.surfaceAlt,     icon: "✅" };
    default:                      return { bg: theme.surfaceAlt,     icon: "📋" };
  }
}

function insightAccentColor(type: Insight["type"], theme: ThemeTokens): string {
  switch (type) {
    case "unused":                return theme.warning;
    case "duplicate":             return theme.primary;
    case "annual_saving":         return theme.success;
    case "trial_ending":          return theme.danger;
    case "high_spend":            return theme.secondary;
    case "spend_summary":         return theme.surfaceAlt;
    case "cancellation_reminder": return theme.quietText;
    default:                      return theme.quietText;
  }
}

function labelCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short" });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { theme } = useSubRadarTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { subscriptions, spendSummary } = useSubscriptionStore();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const insights = useMemo(() => generateInsights(subscriptions), [subscriptions]);
  const visibleInsights = insights.filter((i) => !dismissed.includes(i.id));
  const savingOpportunity = getTotalSavingOpportunity(insights);

  const totalMonthlyMinor = subscriptions.reduce((sum, s) => sum + monthlyAmount(s), 0);

  const sortedSubscriptions = useMemo(() =>
    [...subscriptions].sort((a, b) =>
      sortDirection === "desc"
        ? monthlyAmount(b) - monthlyAmount(a)
        : monthlyAmount(a) - monthlyAmount(b)
    ),
    [subscriptions, sortDirection]
  );

  // ── 6-month chart data ──
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const base = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: formatMonthLabel(base),
        isCurrent: i === 5,
        amountMinor: totalMonthlyMinor  // flat approximation — no historical data
      };
    });
  }, [totalMonthlyMinor]);

  const maxBarAmount = Math.max(...chartData.map((d) => d.amountMinor), 1);

  // ── Category breakdown from spendSummary ──
  const categoryRows = useMemo(() =>
    [...spendSummary.byCategory]
      .filter((c) => c.monthlyMinor > 0)
      .sort((a, b) => b.monthlyMinor - a.monthlyMinor),
    [spendSummary.byCategory]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Insights</Text>
          {savingOpportunity > 0 ? (
            <View style={styles.savingsPill}>
              <Text style={styles.savingsPillArrow} accessible={false}>↑</Text>
              <Text style={styles.savingsPillText}>Save up to ${savingOpportunity.toFixed(0)}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Monthly spend chart ── */}
        <Text style={styles.sectionLabel}>MONTHLY SPEND</Text>
        <View style={styles.chartCard}>
          <Text style={styles.chartTotal}>{formatMoney(totalMonthlyMinor)}</Text>
          <Text style={styles.chartTotalSub}>this month</Text>
          <View style={styles.barRow}>
            {chartData.map((entry, i) => {
              const barH = Math.max(4, Math.round((entry.amountMinor / maxBarAmount) * 80));
              return (
                <View key={i} style={styles.barColumn}>
                  {entry.isCurrent ? (
                    <Text style={styles.barValueLabel}>{formatMoney(entry.amountMinor)}</Text>
                  ) : null}
                  <View style={[styles.bar, {
                    height: barH,
                    backgroundColor: entry.isCurrent ? theme.primary : theme.surfaceAlt
                  }]} />
                  <Text style={[styles.barLabel, { color: entry.isCurrent ? theme.primary : theme.quietText }]}>
                    {entry.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Insights feed ── */}
        <Text style={styles.sectionLabel}>INSIGHTS</Text>
        {visibleInsights.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyCheck} accessible={false}>✓</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyBody}>No insights right now. Check back later.</Text>
          </View>
        ) : (
          visibleInsights.map((insight) => {
            const iconMeta = insightIconMeta(insight.type, theme);
            return (
              <View key={insight.id} style={styles.insightCard}>
                <View style={[styles.insightAccent, { backgroundColor: insightAccentColor(insight.type, theme) }]} />
                <View style={styles.insightContent}>
                  <View style={styles.insightTopRow}>
                    <View style={[styles.insightIconWrap, { backgroundColor: iconMeta.bg }]} accessible={false} importantForAccessibility="no-hide-descendants">
                      <Text style={styles.insightIconText}>{iconMeta.icon}</Text>
                    </View>
                    <View style={styles.insightTextWrap}>
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                      <Text style={styles.insightMessage}>{insight.message}</Text>
                      {insight.savingAmount && insight.savingAmount > 0 ? (
                        <View style={styles.insightSavingPill}>
                          <Text style={styles.insightSavingText}>
                            Save {formatMoney(insight.savingAmount)}/mo
                          </Text>
                        </View>
                      ) : null}
                      {insight.actionLabel ? (
                        <Pressable accessibilityRole="button" onPress={() => insight.actionRoute && router.push(insight.actionRoute as never)}>
                          <Text style={styles.insightAction}>{insight.actionLabel}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Dismiss insight"
                      hitSlop={10}
                      style={styles.dismissBtn}
                      onPress={() => setDismissed((c) => [...c, insight.id])}
                    >
                      <Text style={styles.dismissText}>×</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* ── Category breakdown ── */}
        <Text style={styles.sectionLabel}>SPEND BREAKDOWN</Text>
        <View style={styles.groupCard}>
          {categoryRows.length === 0 ? (
            <View style={styles.emptyRow}><Text style={styles.emptyRowText}>No spend data yet</Text></View>
          ) : (
            categoryRows.map((cat, index) => {
              const isLast = index === categoryRows.length - 1;
              const pct = Math.min((cat.monthlyMinor / Math.max(spendSummary.totalMonthlyMinor, 1)) * 100, 100);
              const avatar = getAvatarStyle(cat.category, theme);
              const barColor = getCategoryColor(cat.category, theme);
              return (
                <View key={cat.category}>
                  <View style={styles.catRow}>
                    <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.avatarText, { color: avatar.text }]}>
                        {labelCategory(cat.category).charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName}>{labelCategory(cat.category)}</Text>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                    <View style={styles.catRight}>
                      <Text style={styles.catAmount}>{formatMoney(cat.monthlyMinor)}</Text>
                      <Text style={styles.catPct}>{Math.round(pct)}%</Text>
                    </View>
                  </View>
                  {!isLast ? <View style={styles.rowSep} /> : null}
                </View>
              );
            })
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total monthly</Text>
            <Text style={styles.totalAmount}>{formatMoney(spendSummary.totalMonthlyMinor)}</Text>
          </View>
        </View>

        {/* ── All subscriptions ── */}
        <View style={styles.tableHeaderRow}>
          <Text style={styles.sectionLabel}>ALL SUBSCRIPTIONS</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort by amount, currently ${sortDirection === "desc" ? "descending" : "ascending"}`}
            onPress={() => setSortDirection((d) => d === "desc" ? "asc" : "desc")}
            style={styles.sortBtn}
          >
            <Text style={styles.sortBtnText}>Amount {sortDirection === "desc" ? "↓" : "↑"}</Text>
          </Pressable>
        </View>
        <View style={styles.groupCard}>
          {sortedSubscriptions.length === 0 ? (
            <View style={styles.emptyRow}><Text style={styles.emptyRowText}>No subscriptions yet</Text></View>
          ) : (
            sortedSubscriptions.map((sub, index) => {
              const avatar = getAvatarStyle(sub.category, theme);
              const days = getDaysRemaining(sub.nextRenewalDate);
              const badge = getUrgencyBadge(days, theme);
              const isLast = index === sortedSubscriptions.length - 1;
              return (
                <Pressable
                  key={sub.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${sub.name}, ${formatMoney(monthlyAmount(sub))} per month`}
                  onPress={() => router.push(`/subscription/${sub.id}` as never)}
                >
                  <View style={styles.subRow}>
                    <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.avatarText, { color: avatar.text }]}>
                        {sub.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.subMiddle}>
                      <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
                      <Text style={styles.subMeta}>
                        {formatShortDate(sub.nextRenewalDate, "TBD")} · {sub.billingCycle}
                      </Text>
                    </View>
                    <View style={styles.subRight}>
                      <Text style={styles.subAmount}>{formatMoney(monthlyAmount(sub))}</Text>
                      {badge ? (
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {!isLast ? <View style={styles.rowSep} /> : null}
                </Pressable>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 100, backgroundColor: theme.background },

    pageHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.screenH,
      paddingTop: 16,
      paddingBottom: 4
    },
    pageTitle: { fontSize: 28, fontWeight: "800", color: theme.text, letterSpacing: -1.5 },
    savingsPill: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: theme.successSurface, borderWidth: 0.5,
      borderColor: withAlpha(theme.success, 0.2), borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5
    },
    savingsPillArrow: { fontSize: 12, color: theme.success },
    savingsPillText: { fontSize: 12, fontWeight: "600", color: theme.success },

    sectionLabel: {
      ...typography.sectionHeader, color: theme.mutedText,
      paddingHorizontal: spacing.screenH, paddingBottom: 8, paddingTop: 20
    },

    // Chart
    chartCard: { marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 8 },
    chartTotal: { fontSize: 34, fontWeight: "700", color: theme.text, letterSpacing: -1.5, fontVariant: ["tabular-nums"] },
    chartTotalSub: { fontSize: 13, color: theme.mutedText, marginTop: 2 },
    barRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80, marginTop: 20 },
    barColumn: { flex: 1, alignItems: "center" },
    bar: { width: "100%", borderRadius: 4 },
    barValueLabel: { fontSize: 10, fontWeight: "600", color: theme.primary, marginBottom: 4 },
    barLabel: { marginTop: 6, fontSize: 10, fontWeight: "500" },

    // Insight cards
    insightCard: {
      marginHorizontal: 16, marginBottom: 8,
      backgroundColor: theme.card, borderRadius: 16, overflow: "hidden"
    },
    insightAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
    insightContent: { paddingVertical: 14, paddingLeft: 19, paddingRight: 16 },
    insightTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    insightIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    insightIconText: { fontSize: 16, textAlign: "center", lineHeight: 34 },
    insightTextWrap: { flex: 1 },
    insightTitle: { fontSize: 15, fontWeight: "600", color: theme.text, letterSpacing: -0.2, marginBottom: 4 },
    insightMessage: { fontSize: 13, color: theme.mutedText, lineHeight: 18, letterSpacing: -0.1 },
    insightSavingPill: { marginTop: 10, alignSelf: "flex-start", backgroundColor: theme.successSurface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    insightSavingText: { fontSize: 11, fontWeight: "600", color: theme.success },
    insightAction: { fontSize: 13, fontWeight: "600", color: theme.primary, letterSpacing: -0.1, marginTop: 10 },
    dismissBtn: { padding: 4 },
    dismissText: { fontSize: 20, color: theme.quietText },

    // Empty state
    emptyState: { paddingVertical: 40, paddingHorizontal: 20, alignItems: "center" },
    emptyCheck: { fontSize: 40, marginBottom: 16, color: theme.success },
    emptyTitle: { fontSize: 20, fontWeight: "600", color: theme.text, letterSpacing: -0.5, marginBottom: 8 },
    emptyBody: { fontSize: 15, color: theme.mutedText, textAlign: "center" },

    // Grouped card
    groupCard: { marginHorizontal: 16, backgroundColor: theme.card, borderRadius: spacing.groupRadius, overflow: "hidden" },
    rowSep: { height: 0.5, backgroundColor: theme.border },
    emptyRow: { padding: 16, alignItems: "center" },
    emptyRowText: { ...typography.callout, color: theme.mutedText },

    // Category rows
    catRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14 },
    catName: { ...typography.subheadline, color: theme.text },
    progressTrack: { marginTop: 6, height: 3, backgroundColor: theme.surfaceAlt, borderRadius: 2 },
    progressFill: { height: 3, borderRadius: 2 },
    catRight: { alignItems: "flex-end" },
    catAmount: { ...typography.subheadline, fontWeight: "500", color: theme.text, fontVariant: ["tabular-nums"] },
    catPct: { ...typography.caption1, color: theme.mutedText, marginTop: 1, textAlign: "right" },
    totalRow: {
      paddingHorizontal: 16, paddingVertical: 13,
      borderTopWidth: 0.5, borderTopColor: theme.border,
      flexDirection: "row", justifyContent: "space-between"
    },
    totalLabel: { fontSize: 14, fontWeight: "600", color: theme.text },
    totalAmount: { fontSize: 14, fontWeight: "700", color: theme.text, fontVariant: ["tabular-nums"] },

    // Sort / table header row
    tableHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingRight: spacing.screenH
    },
    sortBtn: {
      borderRadius: 20, borderWidth: 0.5, borderColor: withAlpha(theme.primary, 0.35),
      paddingHorizontal: 10, paddingVertical: 7, marginTop: 20
    },
    sortBtnText: { fontSize: 12, fontWeight: "600", color: theme.primary },

    // Subscription rows
    subRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14, minHeight: spacing.rowH + 8 },
    avatar: { width: spacing.avatarMd, height: spacing.avatarMd, borderRadius: spacing.avatarRadius.md, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 13, fontWeight: "700" },
    subMiddle: { flex: 1 },
    subName: { ...typography.subheadline, color: theme.text },
    subMeta: { ...typography.caption1, color: theme.mutedText, marginTop: 1 },
    subRight: { alignItems: "flex-end" },
    subAmount: { ...typography.subheadline, fontWeight: "500", color: theme.text, fontVariant: ["tabular-nums"] },
    badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
    badgeText: { ...typography.caption1 }
  });
}
