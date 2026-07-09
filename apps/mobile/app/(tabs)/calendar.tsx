import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, type DateData } from "react-native-calendars";
import { getMarkedDates, getProjectedAnnual, getSubscriptionsForDate, getWeeklyGroups, getMonthlyTotal } from "../../src/utils/calendarUtils";
import { formatMoney } from "../../src/utils/format";
import { formatShortDate, getDaysRemaining, getUrgencyBadge } from "../../src/utils/subscription-ui";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { convertMinor, type CurrencyCode, type FxContext, type Subscription } from "@zeno/shared";
import { ServiceAvatar } from "../../src/components/zeno";
import { useZenoTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { fonts } from "../../src/theme/zeno";
import { spacing } from "../../src/theme/spacing";

// ─── Helpers (logic unchanged) ────────────────────────────────────────────────

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

function cycleBadge(sub: Subscription): string {
  if (sub.billingCycle === "monthly") return "Monthly";
  if (sub.billingCycle === "annual")  return "Annual";
  return sub.billingCycle;
}

function getCalendarTheme(theme: ThemeTokens) {
  return {
    backgroundColor: theme.background,
    calendarBackground: theme.card,
    textSectionTitleColor: theme.quietText,
    selectedDayBackgroundColor: theme.primary,
    selectedDayTextColor: theme.onPrimary,
    todayTextColor: theme.primary,
    dayTextColor: theme.text,
    textDisabledColor: theme.quietText,
    arrowColor: theme.primary,
    monthTextColor: theme.text,
    indicatorColor: theme.primary,
    textDayFontWeight: "400" as const,
    textMonthFontWeight: "700" as const,
    textDayHeaderFontWeight: "500" as const,
    textDayFontSize: 14,
    textMonthFontSize: 20,
    textDayHeaderFontSize: 11
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DayPanel({
  date, subscriptions, onClose, homeCurrency, fx
}: {
  date: string;
  subscriptions: Subscription[];
  onClose: () => void;
  homeCurrency: CurrencyCode;
  fx: FxContext | undefined;
}) {
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // useState (not useRef): reading a ref's .current during render is unsafe
  // under the React Compiler; Animated.Value mutates via its own setValue()
  // outside React's render cycle regardless, so this is a drop-in swap.
  const [slideAnim] = useState(() => new Animated.Value(-20));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    slideAnim.setValue(-20);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true })
    ]).start();
  }, [date, slideAnim, opacityAnim]);

  // Never silently sum raw minor units across currencies — convert each
  // charge into homeCurrency when a rate table is available, and skip (rather
  // than fabricate) a subscription whose currency has no usable rate.
  const dayTotal = subscriptions.reduce((sum, s) => {
    const amount = fx ? convertMinor(s.price.amountMinor, s.price.currency, fx.homeCurrency, fx.rates) : s.price.amountMinor;
    return amount === null ? sum : sum + amount;
  }, 0);

  return (
    <Animated.View style={[styles.panelCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelDate}>{formatDateHeader(date)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close day panel" hitSlop={10} onPress={onClose}>
          <Text style={styles.panelClose}>×</Text>
        </Pressable>
      </View>
      <View style={styles.panelSep} />
      {subscriptions.map((sub, index) => {
        const isLast = index === subscriptions.length - 1;
        return (
          <Pressable
            key={sub.id}
            accessibilityRole="button"
            accessibilityLabel={`${sub.name}, ${formatMoney(sub.price.amountMinor, sub.price.currency)}`}
            onPress={() => router.push(`/subscription/${sub.id}`)}
          >
            <View style={styles.panelRow}>
              <ServiceAvatar name={sub.name} size={spacing.avatarMd} />
              <View style={styles.panelMiddle}>
                <Text style={styles.panelName} numberOfLines={1}>{sub.name}</Text>
                <Text style={styles.panelCycle}>{cycleBadge(sub)}</Text>
              </View>
              <View style={styles.panelRight}>
                <Text style={styles.panelAmount}>{formatMoney(sub.price.amountMinor, sub.price.currency)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel ${sub.name}`}
                  hitSlop={8}
                  onPress={() => router.push(`/subscription/cancel/${sub.id}`)}
                >
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
        <Text style={styles.panelFooterAmount}>{formatMoney(dayTotal, homeCurrency)}</Text>
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
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (subscriptions.length === 0) return null;
  return (
    <View>
      <View style={styles.groupHeaderRow}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupTotal}>{formatMoney(Math.round(total * 100))}</Text>
      </View>
      <View style={styles.groupCard}>
        {subscriptions.map((sub, index) => {
          const days = getDaysRemaining(sub.nextRenewalDate);
          const badge = getUrgencyBadge(days, theme);
          const isLast = index === subscriptions.length - 1;
          return (
            <Pressable
              key={sub.id}
              accessibilityRole="button"
              accessibilityLabel={`${sub.name}, ${formatMoney(sub.price.amountMinor, sub.price.currency)}, renews ${formatShortDate(sub.nextRenewalDate, "TBD")}`}
              onPress={() => router.push(`/subscription/${sub.id}`)}
            >
              <View style={styles.renewalRow}>
                <ServiceAvatar name={sub.name} size={spacing.avatarMd} />
                <View style={styles.renewalMiddle}>
                  <Text style={styles.renewalName} numberOfLines={1}>{sub.name}</Text>
                  <Text style={styles.renewalMeta}>{formatShortDate(sub.nextRenewalDate, "TBD")}</Text>
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
  const { theme, scheme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const calendarTheme = useMemo(() => getCalendarTheme(theme), [theme]);
  const { subscriptions, homeCurrency, fx } = useSubscriptionStore();
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
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const monthlyTotal = useMemo(() =>
    getMonthlyTotal(activeSubscriptions, nowYear, nowMonth, fx),
    [activeSubscriptions, nowYear, nowMonth, fx]
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
        selectedColor: theme.primary,
        selectedTextColor: theme.onPrimary
      }
    };
  }, [activeSubscriptions, selectedDate, theme]);

  const next30Count = groups.thisWeek.length + groups.nextWeek.length + groups.laterThisMonth.length;

  const next7ValueColor = hasDueSoon ? theme.danger
    : next7DaysList.length > 0 ? theme.warning
    : theme.text;

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
            <Text style={styles.statValue}>{formatMoney(Math.round(monthlyTotal * 100), homeCurrency)}</Text>
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
            key={scheme}
            style={styles.calendar}
            markedDates={markedDates}
            markingType="multi-dot"
            onDayPress={onDayPress}
            theme={calendarTheme}
          />
        </View>

        {/* Day panel */}
        {panelOpen && selectedList.length > 0 ? (
          <DayPanel
            date={selectedDate}
            subscriptions={selectedList}
            onClose={() => setPanelOpen(false)}
            homeCurrency={homeCurrency}
            fx={fx}
          />
        ) : null}

        {/* Upcoming section */}
        <Text style={styles.sectionLabel}>UPCOMING</Text>

        {next30Count === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyCheck} accessible={false}>✓</Text>
            <Text style={styles.emptyTitle}>No upcoming renewals</Text>
            <Text style={styles.emptyBody}>Add subscriptions to track renewals here.</Text>
            <Pressable accessibilityRole="button" style={styles.emptyBtn} onPress={() => router.push("/subscription/add")}>
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

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 100, backgroundColor: theme.background },

    pageTitle: {
      fontSize: 30, fontFamily: fonts.display.bold, color: theme.text, letterSpacing: -0.6,
      paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4
    },

    // Stats
    statsRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
    statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14 },
    statLabel: { ...typography.sectionHeader, color: theme.mutedText, marginBottom: 6 },
    statValue: { fontSize: 20, fontFamily: fonts.mono.bold, color: theme.text, letterSpacing: -0.5 },
    statSub: { ...typography.caption1, color: theme.mutedText, marginTop: 3 },

    // Calendar
    calendarCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },
    calendar: { paddingBottom: 4 },

    // Day panel
    panelCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },
    panelHeader: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    panelDate: { fontSize: 15, fontWeight: "600", color: theme.text, letterSpacing: -0.2 },
    panelClose: { fontSize: 20, color: theme.quietText },
    panelSep: { height: 0.5, backgroundColor: theme.border },
    panelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14 },
    panelMiddle: { flex: 1 },
    panelName: { ...typography.subheadline, color: theme.text },
    panelCycle: { ...typography.caption1, color: theme.mutedText, marginTop: 1 },
    panelRight: { alignItems: "flex-end" },
    panelAmount: { fontSize: 15, fontFamily: fonts.mono.semibold, color: theme.text, fontVariant: ["tabular-nums"] },
    cancelLink: { fontSize: 12, fontWeight: "600", color: theme.danger, marginTop: 3 },
    panelFooter: {
      paddingHorizontal: 16, padding: 10, borderTopWidth: 0.5, borderTopColor: theme.border,
      flexDirection: "row", justifyContent: "space-between"
    },
    panelFooterLabel: { fontSize: 13, color: theme.mutedText },
    panelFooterAmount: { fontSize: 13, fontFamily: fonts.mono.semibold, color: theme.text, fontVariant: ["tabular-nums"] },

    // Section label
    sectionLabel: { ...typography.sectionHeader, color: theme.mutedText, paddingHorizontal: spacing.screenH, paddingBottom: 8, paddingTop: 20 },

    // Group
    groupHeaderRow: { paddingHorizontal: spacing.screenH, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    groupTitle: { fontSize: 13, fontWeight: "600", color: theme.mutedText, letterSpacing: -0.1 },
    groupTotal: { fontSize: 13, fontFamily: fonts.mono.regular, color: theme.mutedText, fontVariant: ["tabular-nums"] },
    groupCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },

    // Renewal rows
    renewalRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 14, minHeight: spacing.rowH + 8 },
    renewalMiddle: { flex: 1 },
    renewalName: { ...typography.subheadline, color: theme.text },
    renewalMeta: { ...typography.caption1, color: theme.mutedText, marginTop: 1 },
    renewalRight: { alignItems: "flex-end" },
    renewalAmount: { fontSize: 15, fontFamily: fonts.mono.semibold, color: theme.text, fontVariant: ["tabular-nums"] },
    badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
    badgeText: { ...typography.caption1 },
    rowSep: { position: "absolute", left: 64, right: 0, bottom: 0, height: 0.5, backgroundColor: theme.border },

    // Avatar
    avatar: { width: spacing.avatarMd, height: spacing.avatarMd, borderRadius: spacing.avatarRadius.md, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 13, fontWeight: "700" },

    // Empty state
    emptyState: { paddingVertical: 40, paddingHorizontal: 20, alignItems: "center" },
    emptyCheck: { fontSize: 40, color: theme.success, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: "600", color: theme.text, letterSpacing: -0.5, marginBottom: 8 },
    emptyBody: { fontSize: 15, color: theme.mutedText, textAlign: "center" },
    emptyBtn: { marginTop: 20, backgroundColor: theme.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
    emptyBtnText: { fontSize: 15, fontWeight: "600", color: theme.onPrimary }
  });
}
