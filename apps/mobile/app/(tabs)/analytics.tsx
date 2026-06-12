import { monthlyAmount, type Subscription, type SubscriptionCategory } from "@subradar/shared";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { generateInsights, getTotalSavingOpportunity } from "../../src/insights/insightsEngine";
import type { Insight } from "../../src/insights/insightsEngine";
import { formatMoney } from "../../src/notifications/renewal-reminders";
import { colors } from "../../src/theme/colors";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function getCategoryBarColor(category: string): string {
  switch (category) {
    case "streaming":
    case "entertainment":   return colors.red;
    case "ai_tools":        return colors.purple;
    case "productivity":    return colors.blue;
    case "gaming":          return colors.green;
    case "health":          return colors.orange;
    case "music":           return "rgba(255,55,95,1)";
    default:                return colors.label4;
  }
}

function insightIconMeta(type: Insight["type"]): { bg: string; icon: string } {
  switch (type) {
    case "unused":                return { bg: "rgba(255,159,10,0.15)",  icon: "🕐" };
    case "duplicate":             return { bg: "rgba(10,132,255,0.15)",  icon: "🔄" };
    case "annual_saving":         return { bg: "rgba(48,209,88,0.15)",   icon: "💰" };
    case "trial_ending":          return { bg: "rgba(255,69,58,0.15)",   icon: "⏰" };
    case "high_spend":            return { bg: "rgba(191,90,242,0.15)",  icon: "📊" };
    case "cancellation_reminder": return { bg: "rgba(255,255,255,0.06)", icon: "✅" };
    default:                      return { bg: "rgba(255,255,255,0.06)", icon: "📋" };
  }
}

function insightAccentColor(type: Insight["type"]): string {
  switch (type) {
    case "unused":                return colors.orange;
    case "duplicate":             return colors.blue;
    case "annual_saving":         return colors.green;
    case "trial_ending":          return colors.red;
    case "high_spend":            return colors.purple;
    case "spend_summary":         return colors.surfaceHigher;
    case "cancellation_reminder": return colors.label4;
    default:                      return colors.label4;
  }
}

function urgencyBadge(days: number | null): { bg: string; text: string; label: string } | null {
  if (days === null) return null;
  if (days === 0)   return { bg: "rgba(255,69,58,0.2)",    text: "#FF453A", label: "TODAY"       };
  if (days <= 3)    return { bg: "rgba(255,69,58,0.15)",   text: "#FF6961", label: `${days} days` };
  if (days <= 7)    return { bg: "rgba(255,159,10,0.15)",  text: colors.orange, label: `${days} days` };
  return              { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.3)", label: `${days} days` };
}

function getDaysRemaining(dateValue?: string | null): number | null {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.max(0, Math.ceil((targetUTC - todayUTC) / (24 * 60 * 60 * 1000)));
}

function formatShortDate(dateValue?: string | null): string {
  if (!dateValue) return "TBD";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function labelCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short" });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
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
              <Text style={styles.savingsPillArrow}>↑</Text>
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
                    backgroundColor: entry.isCurrent ? colors.blue : colors.surfaceHigher
                  }]} />
                  <Text style={[styles.barLabel, { color: entry.isCurrent ? colors.blue : colors.label4 }]}>
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
            <Text style={styles.emptyCheck}>✓</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyBody}>No insights right now. Check back later.</Text>
          </View>
        ) : (
          visibleInsights.map((insight) => {
            const iconMeta = insightIconMeta(insight.type);
            return (
              <View key={insight.id} style={styles.insightCard}>
                <View style={[styles.insightAccent, { backgroundColor: insightAccentColor(insight.type) }]} />
                <View style={styles.insightContent}>
                  <View style={styles.insightTopRow}>
                    <View style={[styles.insightIconWrap, { backgroundColor: iconMeta.bg }]}>
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
                        <Pressable onPress={() => insight.actionRoute && router.push(insight.actionRoute as never)}>
                          <Text style={styles.insightAction}>{insight.actionLabel}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Pressable style={styles.dismissBtn} onPress={() => setDismissed((c) => [...c, insight.id])}>
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
              const avatar = getAvatarStyle(cat.category);
              const barColor = getCategoryBarColor(cat.category);
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
              const avatar = getAvatarStyle(sub.category);
              const days = getDaysRemaining(sub.nextRenewalDate);
              const badge = urgencyBadge(days);
              const isLast = index === sortedSubscriptions.length - 1;
              return (
                <Pressable key={sub.id} onPress={() => router.push(`/subscription/${sub.id}` as never)}>
                  <View style={styles.subRow}>
                    <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.avatarText, { color: avatar.text }]}>
                        {sub.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.subMiddle}>
                      <Text style={styles.subName} numberOfLines={1}>{sub.name}</Text>
                      <Text style={styles.subMeta}>
                        {formatShortDate(sub.nextRenewalDate)} · {sub.billingCycle}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 100, backgroundColor: colors.bg },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    paddingBottom: 4
  },
  pageTitle: { fontSize: 28, fontWeight: "800", color: colors.label, letterSpacing: -1.5 },
  savingsPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(48,209,88,0.1)", borderWidth: 0.5,
    borderColor: "rgba(48,209,88,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5
  },
  savingsPillArrow: { fontSize: 12, color: colors.green },
  savingsPillText: { fontSize: 12, fontWeight: "600", color: colors.green },

  sectionLabel: {
    ...typography.sectionHeader, color: colors.label3,
    paddingHorizontal: spacing.screenH, paddingBottom: 8, paddingTop: 20
  },

  // Chart
  chartCard: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 8 },
  chartTotal: { fontSize: 34, fontWeight: "700", color: colors.label, letterSpacing: -1.5, fontVariant: ["tabular-nums"] },
  chartTotalSub: { fontSize: 13, color: colors.label3, marginTop: 2 },
  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80, marginTop: 20 },
  barColumn: { flex: 1, alignItems: "center" },
  bar: { width: "100%", borderRadius: 4 },
  barValueLabel: { fontSize: 10, fontWeight: "600", color: colors.blue, marginBottom: 4 },
  barLabel: { marginTop: 6, fontSize: 10, fontWeight: "500" },

  // Insight cards
  insightCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden"
  },
  insightAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  insightContent: { paddingVertical: 14, paddingLeft: 19, paddingRight: 16 },
  insightTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  insightIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  insightIconText: { fontSize: 16, textAlign: "center", lineHeight: 34 },
  insightTextWrap: { flex: 1 },
  insightTitle: { fontSize: 15, fontWeight: "600", color: colors.label, letterSpacing: -0.2, marginBottom: 4 },
  insightMessage: { fontSize: 13, color: colors.label3, lineHeight: 18, letterSpacing: -0.1 },
  insightSavingPill: { marginTop: 10, alignSelf: "flex-start", backgroundColor: "rgba(48,209,88,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  insightSavingText: { fontSize: 11, fontWeight: "600", color: colors.green },
  insightAction: { fontSize: 13, fontWeight: "600", color: colors.blue, letterSpacing: -0.1, marginTop: 10 },
  dismissBtn: { padding: 4 },
  dismissText: { fontSize: 20, color: colors.label4 },

  // Empty state
  emptyState: { paddingVertical: 40, paddingHorizontal: 20, alignItems: "center" },
  emptyCheck: { fontSize: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: colors.label, letterSpacing: -0.5, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: colors.label3, textAlign: "center" },

  // Grouped card
  groupCard: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: spacing.groupRadius, overflow: "hidden" },
  rowSep: { height: 0.5, backgroundColor: colors.separator },
  emptyRow: { padding: 16, alignItems: "center" },
  emptyRowText: { ...typography.callout, color: colors.label3 },

  // Category rows
  catRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14 },
  catName: { ...typography.subheadline, color: colors.label },
  progressTrack: { marginTop: 6, height: 3, backgroundColor: colors.surfaceHigher, borderRadius: 2 },
  progressFill: { height: 3, borderRadius: 2 },
  catRight: { alignItems: "flex-end" },
  catAmount: { ...typography.subheadline, fontWeight: "500", color: colors.label, fontVariant: ["tabular-nums"] },
  catPct: { ...typography.caption1, color: colors.label3, marginTop: 1, textAlign: "right" },
  totalRow: {
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 0.5, borderTopColor: colors.separator,
    flexDirection: "row", justifyContent: "space-between"
  },
  totalLabel: { fontSize: 14, fontWeight: "600", color: colors.label },
  totalAmount: { fontSize: 14, fontWeight: "700", color: colors.label, fontVariant: ["tabular-nums"] },

  // Sort / table header row
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: spacing.screenH
  },
  sortBtn: {
    borderRadius: 20, borderWidth: 0.5, borderColor: "rgba(10,132,255,0.35)",
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 20
  },
  sortBtnText: { fontSize: 12, fontWeight: "600", color: colors.blue },

  // Subscription rows
  subRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14, minHeight: spacing.rowH + 8 },
  avatar: { width: spacing.avatarMd, height: spacing.avatarMd, borderRadius: spacing.avatarRadius.md, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "700" },
  subMiddle: { flex: 1 },
  subName: { ...typography.subheadline, color: colors.label },
  subMeta: { ...typography.caption1, color: colors.label3, marginTop: 1 },
  subRight: { alignItems: "flex-end" },
  subAmount: { ...typography.subheadline, fontWeight: "500", color: colors.label, fontVariant: ["tabular-nums"] },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  badgeText: { ...typography.caption1 }
});
