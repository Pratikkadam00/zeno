import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, type DateData } from "react-native-calendars";
import { getMarkedDates, getProjectedAnnual, getSubscriptionsForDate, getWeeklyGroups, getMonthlyTotal } from "../../src/utils/calendarUtils";
import { formatMoney } from "../../src/notifications/renewal-reminders";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import type { Subscription } from "@subradar/shared";
import { colors } from "../../src/theme/colors";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers (logic unchanged) ────────────────────────────────────────────────

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDaysRemaining(dateValue: string | undefined): number | null {
  const target = parseDate(dateValue);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next  = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.max(0, Math.ceil((next.getTime() - today.getTime()) / DAY_MS));
}

function toDateKey(dateValue: string | undefined): string | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getThisMonthKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function formatDateHeader(dateString: string): string {
  const parsed = parseDate(dateString);
  if (!parsed) return dateString;
  return parsed.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatShortDate(dateValue: string | undefined): string {
  const parsed = parseDate(dateValue);
  if (!parsed) return "TBD";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function cycleBadge(sub: Subscription): string {
  if (sub.billingCycle === "monthly") return "Monthly";
  if (sub.billingCycle === "annual")  return "Annual";
  return sub.billingCycle;
}

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

function urgencyBadge(days: number | null): { bg: string; text: string; label: string } | null {
  if (days === null) return null;
  if (days === 0)  return { bg: "rgba(255,69,58,0.2)",    text: "#FF453A",              label: "TODAY"       };
  if (days <= 3)   return { bg: "rgba(255,69,58,0.15)",   text: "#FF6961",              label: `${days} days` };
  if (days <= 7)   return { bg: "rgba(255,159,10,0.15)",  text: colors.orange,          label: `${days} days` };
  return             { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.3)", label: `${days} days` };
}

const CALENDAR_THEME = {
  backgroundColor: colors.bg,
  calendarBackground: colors.surface,
  textSectionTitleColor: colors.label4,
  selectedDayBackgroundColor: colors.blue,
  selectedDayTextColor: "#ffffff",
  todayTextColor: colors.blue,
  dayTextColor: colors.label,
  textDisabledColor: colors.label4,
  arrowColor: colors.blue,
  monthTextColor: colors.label,
  indicatorColor: colors.blue,
  textDayFontWeight: "400" as const,
  textMonthFontWeight: "700" as const,
  textDayHeaderFontWeight: "500" as const,
  textDayFontSize: 14,
  textMonthFontSize: 20,
  textDayHeaderFontSize: 11
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DayPanel({
  date, subscriptions, onClose
}: {
  date: string;
  subscriptions: Subscription[];
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.setValue(-20);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true })
    ]).start();
  }, [date, slideAnim, opacityAnim]);

  const dayTotal = subscriptions.reduce((sum, s) => sum + s.price.amountMinor, 0);

  return (
    <Animated.View style={[styles.panelCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelDate}>{formatDateHeader(date)}</Text>
        <Pressable onPress={onClose}><Text style={styles.panelClose}>×</Text></Pressable>
      </View>
      <View style={styles.panelSep} />
      {subscriptions.map((sub, index) => {
        const avatar = getAvatarStyle(sub.category);
        const isLast = index === subscriptions.length - 1;
        return (
          <Pressable key={sub.id} onPress={() => router.push(`/subscription/${sub.id}`)}>
            <View style={styles.panelRow}>
              <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                <Text style={[styles.avatarText, { color: avatar.text }]}>
                  {sub.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.panelMiddle}>
                <Text style={styles.panelName} numberOfLines={1}>{sub.name}</Text>
                <Text style={styles.panelCycle}>{cycleBadge(sub)}</Text>
              </View>
              <View style={styles.panelRight}>
                <Text style={styles.panelAmount}>{formatMoney(sub.price.amountMinor, sub.price.currency)}</Text>
                <Pressable onPress={() => router.push(`/subscription/cancel/${sub.id}`)}>
                  <Text style={styles.cancelLink}>Cancel →</Text>
                </Pressable>
              </View>
            </View>
            {!isLast ? <View style={styles.rowSep} /> : null}
          </Pressable>
        );
      })}
      <View style={styles.panelFooter}>
        <Text style={styles.panelFooterLabel}>Total for this day</Text>
        <Text style={styles.panelFooterAmount}>{formatMoney(dayTotal)}</Text>
      </View>
    </Animated.View>
  );
}

function RenewalGroup({
  title, subscriptions, total
}: {
  title: string;
  subscriptions: Subscription[];
  total: number;
}) {
  if (subscriptions.length === 0) return null;
  return (
    <View>
      <View style={styles.groupHeaderRow}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupTotal}>{formatMoney(Math.round(total * 100))}</Text>
      </View>
      <View style={styles.groupCard}>
        {subscriptions.map((sub, index) => {
          const avatar = getAvatarStyle(sub.category);
          const days = getDaysRemaining(sub.nextRenewalDate);
          const badge = urgencyBadge(days);
          const isLast = index === subscriptions.length - 1;
          return (
            <Pressable key={sub.id} onPress={() => router.push(`/subscription/${sub.id}`)}>
              <View style={styles.renewalRow}>
                <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                  <Text style={[styles.avatarText, { color: avatar.text }]}>
                    {sub.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.renewalMiddle}>
                  <Text style={styles.renewalName} numberOfLines={1}>{sub.name}</Text>
                  <Text style={styles.renewalMeta}>{formatShortDate(sub.nextRenewalDate)}</Text>
                </View>
                <View style={styles.renewalRight}>
                  <Text style={styles.renewalAmount}>{formatMoney(sub.price.amountMinor, sub.price.currency)}</Text>
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
        })}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { subscriptions } = useSubscriptionStore();
  const now = new Date();
  const thisMonthKey = getThisMonthKey(now);

  const [selectedDate, setSelectedDate] = useState(() => {
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, "0");
    const d = `${now.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [panelOpen, setPanelOpen] = useState(true);

  const activeSubscriptions = useMemo(() =>
    subscriptions.filter((s) => s.status === "active"),
    [subscriptions]
  );
  const selectedList = useMemo(() =>
    getSubscriptionsForDate(activeSubscriptions, selectedDate),
    [activeSubscriptions, selectedDate]
  );
  const groups = useMemo(() => getWeeklyGroups(activeSubscriptions), [activeSubscriptions]);
  const monthlyTotal = useMemo(() =>
    getMonthlyTotal(activeSubscriptions, now.getFullYear(), now.getMonth() + 1),
    [activeSubscriptions]
  );
  const projectedAnnual = useMemo(() => getProjectedAnnual(activeSubscriptions), [activeSubscriptions]);

  const next7DaysList = useMemo(() =>
    activeSubscriptions.filter((sub) => {
      const days = getDaysRemaining(sub.nextRenewalDate);
      return days !== null && days >= 0 && days <= 7;
    }),
    [activeSubscriptions]
  );
  const next7Total = useMemo(() =>
    next7DaysList.reduce((sum, sub) => sum + sub.price.amountMinor / 100, 0),
    [next7DaysList]
  );
  const hasDueSoon = next7DaysList.some((s) => {
    const d = getDaysRemaining(s.nextRenewalDate);
    return d !== null && d <= 3;
  });

  const thisMonthTotalCount = useMemo(() =>
    activeSubscriptions.filter((s) => {
      const key = toDateKey(s.nextRenewalDate);
      return key !== null && key.startsWith(thisMonthKey);
    }).length,
    [activeSubscriptions, thisMonthKey]
  );

  const markedDates = useMemo(() => {
    const base = getMarkedDates(activeSubscriptions);
    const sel = base[selectedDate];
    return {
      ...base,
      [selectedDate]: {
        dots: sel?.dots ?? [],
        marked: true,
        selected: true,
        selectedColor: colors.blue,
        selectedTextColor: "#fff"
      }
    };
  }, [activeSubscriptions, selectedDate]);

  const next30Count = groups.thisWeek.length + groups.nextWeek.length + groups.laterThisMonth.length;

  const next7ValueColor = hasDueSoon ? colors.red
    : next7DaysList.length > 0 ? colors.orange
    : colors.label;

  const groupTotals = useMemo(() => ({
    thisWeek:       groups.thisWeek.reduce((s, sub) => s + sub.price.amountMinor / 100, 0),
    nextWeek:       groups.nextWeek.reduce((s, sub) => s + sub.price.amountMinor / 100, 0),
    laterThisMonth: groups.laterThisMonth.reduce((s, sub) => s + sub.price.amountMinor / 100, 0)
  }), [groups]);

  function onDayPress(day: DateData) {
    setSelectedDate(day.dateString);
    setPanelOpen(true);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <Text style={styles.pageTitle}>Calendar</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>THIS MONTH</Text>
            <Text style={styles.statValue}>{formatMoney(Math.round(monthlyTotal * 100))}</Text>
            <Text style={styles.statSub}>{thisMonthTotalCount} renewals</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>NEXT 7 DAYS</Text>
            <Text style={[styles.statValue, { color: next7ValueColor }]}>
              {formatMoney(Math.round(next7Total * 100))}
            </Text>
            <Text style={styles.statSub}>{next7DaysList.length} due soon</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>THIS YEAR</Text>
            <Text style={styles.statValue}>{formatMoney(Math.round(projectedAnnual * 100))}</Text>
            <Text style={styles.statSub}>projected</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <Calendar
            style={styles.calendar}
            markedDates={markedDates}
            markingType="multi-dot"
            onDayPress={onDayPress}
            theme={CALENDAR_THEME}
          />
        </View>

        {/* Day panel */}
        {panelOpen && selectedList.length > 0 ? (
          <DayPanel
            date={selectedDate}
            subscriptions={selectedList}
            onClose={() => setPanelOpen(false)}
          />
        ) : null}

        {/* Upcoming section */}
        <Text style={styles.sectionLabel}>UPCOMING</Text>

        {next30Count === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyCheck}>✓</Text>
            <Text style={styles.emptyTitle}>No upcoming renewals</Text>
            <Text style={styles.emptyBody}>Add subscriptions to track renewals here.</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push("/subscription/add")}>
              <Text style={styles.emptyBtnText}>Add subscription</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <RenewalGroup title="This week"       subscriptions={groups.thisWeek}        total={groupTotals.thisWeek} />
            <RenewalGroup title="Next week"       subscriptions={groups.nextWeek}        total={groupTotals.nextWeek} />
            <RenewalGroup title="Later this month"subscriptions={groups.laterThisMonth}  total={groupTotals.laterThisMonth} />
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 100, backgroundColor: colors.bg },

  pageTitle: {
    fontSize: 28, fontWeight: "800", color: colors.label, letterSpacing: -1.5,
    paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14 },
  statLabel: { ...typography.sectionHeader, color: colors.label3, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.label, letterSpacing: -0.5 },
  statSub: { ...typography.caption1, color: colors.label3, marginTop: 3 },

  // Calendar
  calendarCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" },
  calendar: { paddingBottom: 4 },

  // Day panel
  panelCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" },
  panelHeader: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelDate: { fontSize: 15, fontWeight: "600", color: colors.label, letterSpacing: -0.2 },
  panelClose: { fontSize: 20, color: colors.label4 },
  panelSep: { height: 0.5, backgroundColor: colors.separator },
  panelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14 },
  panelMiddle: { flex: 1 },
  panelName: { ...typography.subheadline, color: colors.label },
  panelCycle: { ...typography.caption1, color: colors.label3, marginTop: 1 },
  panelRight: { alignItems: "flex-end" },
  panelAmount: { ...typography.subheadline, color: colors.label, fontVariant: ["tabular-nums"] },
  cancelLink: { fontSize: 12, fontWeight: "600", color: colors.red, marginTop: 3 },
  panelFooter: {
    paddingHorizontal: 16, padding: 10, borderTopWidth: 0.5, borderTopColor: colors.separator,
    flexDirection: "row", justifyContent: "space-between"
  },
  panelFooterLabel: { fontSize: 13, color: colors.label3 },
  panelFooterAmount: { fontSize: 13, fontWeight: "600", color: colors.label, fontVariant: ["tabular-nums"] },

  // Section label
  sectionLabel: { ...typography.sectionHeader, color: colors.label3, paddingHorizontal: spacing.screenH, paddingBottom: 8, paddingTop: 20 },

  // Group
  groupHeaderRow: { paddingHorizontal: spacing.screenH, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  groupTitle: { fontSize: 13, fontWeight: "600", color: colors.label2, letterSpacing: -0.1 },
  groupTotal: { fontSize: 13, color: colors.label3, fontVariant: ["tabular-nums"] },
  groupCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" },

  // Renewal rows
  renewalRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14, minHeight: spacing.rowH + 8 },
  renewalMiddle: { flex: 1 },
  renewalName: { ...typography.subheadline, color: colors.label },
  renewalMeta: { ...typography.caption1, color: colors.label3, marginTop: 1 },
  renewalRight: { alignItems: "flex-end" },
  renewalAmount: { ...typography.subheadline, fontWeight: "500", color: colors.label, fontVariant: ["tabular-nums"] },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  badgeText: { ...typography.caption1 },
  rowSep: { position: "absolute", left: 64, right: 0, bottom: 0, height: 0.5, backgroundColor: colors.separator },

  // Avatar
  avatar: { width: spacing.avatarMd, height: spacing.avatarMd, borderRadius: spacing.avatarRadius.md, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "700" },

  // Empty state
  emptyState: { paddingVertical: 40, paddingHorizontal: 20, alignItems: "center" },
  emptyCheck: { fontSize: 40, color: colors.green, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "600", color: colors.label, letterSpacing: -0.5, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: colors.label3, textAlign: "center" },
  emptyBtn: { marginTop: 20, backgroundColor: colors.blue, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" }
});
