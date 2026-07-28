import type { BillingCycle } from "@zeno/shared";
import { router, Stack } from "expo-router";
import { AlarmClock, AlertTriangle, Bell, ChevronRight, Plus, Search, TrendingUp, User } from "lucide-react-native";
import { useEffect, useMemo, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/auth/authStore";
import { checkStatus } from "../../src/billing/revenueCat";
import { AmountDisplay, Button, LedgerLine, ListRow, Masthead, SectionHead, ServiceAvatar } from "../../src/components/zeno";
import { useBudgetStore } from "../../src/data/budget-store";
import { computeBudgetForecast } from "../../src/finance/budget";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { generateInsights, getTotalSavingOpportunity } from "../../src/insights/insightsEngine";
import { useZenoTokens } from "../../src/theme/useZenoTokens";
import { useZenoTheme } from "../../src/theme/theme-provider";
import { currencySymbol, formatMoney } from "../../src/utils/format";
import { categoryLabel, formatShortDate, getCategoryColor, getDaysRemaining } from "../../src/utils/subscription-ui";

// D2 (locked): free tier tracks up to 10 subscriptions.
const FREE_LIMIT = 10;

const CADENCE_SHORT: Record<BillingCycle, string> = {
  weekly: "wk",
  monthly: "mo",
  quarterly: "qtr",
  annual: "yr",
  trial: "trial",
  unknown: ""
};

export default function DashboardScreen() {
  const t = useZenoTokens();
  const c = t.color;
  // getCategoryColor is keyed off the legacy ThemeTokens shape (shared with the
  // analytics screen), so the rule-bar colors match the charts exactly.
  const { theme } = useZenoTheme();
  const insets = useSafeAreaInsets();
  const { subscriptions, totalMonthlyMinor, upcoming, endingTrials, priceHikes, homeCurrency, fx, spendSummary } = useSubscriptionStore();
  const { plan, setPlan } = useAuthStore();

  // Memoized so insight generation and budget forecasting only re-run when the
  // subscriptions/fx inputs actually change, not on every unrelated re-render
  // (P4.4). Fully effective once the store hands these stable identities (P4.2).
  const allInsights = useMemo(() => generateInsights(subscriptions, fx), [subscriptions, fx]);
  const savingOpportunity = useMemo(() => getTotalSavingOpportunity(allInsights), [allInsights]);
  const previewInsights = useMemo(
    () => allInsights.filter((i) => i.type !== "spend_summary").slice(0, 2),
    [allInsights]
  );

  const { config: budgetConfig } = useBudgetStore();
  const budgetForecast = useMemo(() => computeBudgetForecast(subscriptions, undefined, fx), [subscriptions, fx]);
  const attentionSubs = subscriptions.filter((s) => s.status === "attention");
  const trackedCount = subscriptions.filter((s) => s.status !== "cancelled").length;
  const atFreeLimit = trackedCount >= FREE_LIMIT;
  const renewingThisWeek = upcoming.filter((s) => {
    const d = getDaysRemaining(s.nextRenewalDate);
    return d !== null && d <= 7;
  });

  // The category rule-bar: the month's spend ruled proportionally. Reuses the
  // store's already-fx-aware byCategory breakdown (so it excludes the same
  // unconvertible currencies the total does) and the app's category palette.
  const categorySegments = useMemo(
    () =>
      spendSummary.byCategory
        .filter((entry) => entry.monthlyMinor > 0)
        .sort((a, b) => b.monthlyMinor - a.monthlyMinor)
        .map((entry) => ({ category: entry.category, minor: entry.monthlyMinor, color: getCategoryColor(entry.category, theme) })),
    [spendSummary.byCategory, theme]
  );

  // Budget as ONE honest ledger line. With no cap set it invites you to set one;
  // with a cap it states over / left / on pace — never a fabricated status.
  const budgetLine = useMemo(() => {
    const cap = budgetConfig.capMinor;
    if (cap == null) {
      return {
        sub: "NO CAP SET",
        value: "SET ONE",
        color: c.accentText,
        a11y: `Set a monthly budget. Forecast ${formatMoney(budgetForecast.projectedMinor, homeCurrency)} this month.`
      };
    }
    const over = budgetForecast.projectedMinor > cap;
    const approaching = !over && budgetForecast.projectedMinor > cap * 0.85;
    const delta = Math.abs(cap - budgetForecast.projectedMinor);
    return {
      sub: `CAP ${formatMoney(cap, homeCurrency)}`,
      value: over ? `${formatMoney(delta, homeCurrency)} OVER` : approaching ? `${formatMoney(delta, homeCurrency)} LEFT` : "ON PACE",
      color: over ? c.stampAlert : approaching ? c.warning : c.stampVerified,
      a11y: `Budget. ${over ? `${formatMoney(delta, homeCurrency)} over cap` : approaching ? `${formatMoney(delta, homeCurrency)} left` : "On pace"}.`
    };
  }, [budgetConfig.capMinor, budgetForecast.projectedMinor, homeCurrency, c.accentText, c.stampAlert, c.warning, c.stampVerified]);

  useEffect(() => {
    let mounted = true;
    void checkStatus()
      .then((next) => mounted && setPlan(next))
      .catch(() => mounted && setPlan("free"));
    return () => {
      mounted = false;
    };
  }, [setPlan]);

  const hasData = subscriptions.length > 0;

  // Ledger masthead: today's date as the page's dateline, the way a statement
  // is headed. Uses the device locale, uppercased mono in the kicker.
  const dateline = new Date()
    .toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();

  const Header = (
    <Masthead
      kicker={`THE LEDGER · ${dateline}`}
      title="Your ledger"
      left={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push("/settings")}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceSunken, alignItems: "center", justifyContent: "center" }}
        >
          <User size={19} color={c.textSecondary} strokeWidth={2} />
        </Pressable>
      }
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/notifications" as never)}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Bell size={20} color={c.textSecondary} strokeWidth={2} />
        </Pressable>
      }
    />
  );

  if (!hasData) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        {Header}
        {/* The empty ledger is a blank page, not an illustration. */}
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32, paddingBottom: 40 }}>
          <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10.5, letterSpacing: 1.8, color: c.textTertiary, marginBottom: 10 }}>PAGE 1 — BLANK</Text>
          <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 26, letterSpacing: -0.5, color: c.textPrimary, marginBottom: 8, lineHeight: 30 }}>
            Nothing on the books yet.
          </Text>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 14.5, color: c.textSecondary, lineHeight: 22, marginBottom: 24 }}>
            Run your first free scan — no bank login required, processed on your device — or write the first line yourself.
          </Text>
          <Button variant="primary" size="lg" fullWidth onPress={() => router.push("/discover")} leftIcon={<Search size={18} color={c.textOnInk} strokeWidth={2} />}>
            Discover subscriptions
          </Button>
          <Button variant="ghost" size="md" fullWidth onPress={() => router.push("/subscription/add")} style={{ marginTop: 8 }}>
            Add one manually
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      {Header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        {/* THE STATEMENT — a typographic hero ON the paper. Deliberately NOT a
            floating card: the type does the work (the DS "delete-a-card" test). */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", columnGap: 10 }}>
            <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10.5, letterSpacing: 1.8, color: c.textTertiary }}>COMMITTED THIS MONTH</Text>
            <View style={{ flex: 1, minWidth: 12, height: 0, borderBottomWidth: 2, borderStyle: "dotted", borderColor: c.ruleStrong, transform: [{ translateY: -3 }] }} />
            {plan === "free" ? (
              <Pressable
                accessibilityRole={atFreeLimit ? "button" : undefined}
                accessibilityLabel={atFreeLimit ? "Free plan limit reached — upgrade" : undefined}
                disabled={!atFreeLimit}
                onPress={() => router.push("/paywall" as never)}
              >
                <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10.5, letterSpacing: 0.8, color: atFreeLimit ? c.accentText : c.textTertiary }}>
                  {trackedCount}/{FREE_LIMIT} FREE{atFreeLimit ? " ↗" : ""}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* the ledger totals itself on open, like an adding machine */}
          <View style={{ marginTop: 8 }}>
            <AmountDisplay amount={totalMonthlyMinor / 100} currency={currencySymbol(homeCurrency)} size="xl" animate />
          </View>

          {spendSummary.excludedCurrencyCount ? (
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.caption, color: c.textTertiary, marginTop: 6 }}>
              {spendSummary.excludedCurrencyCount} subscription{spendSummary.excludedCurrencyCount > 1 ? "s" : ""} in other currencies not included above.
            </Text>
          ) : null}

          {/* category rule-bar — the month's spend, proportionally ruled */}
          {categorySegments.length > 0 ? (
            <View style={{ flexDirection: "row", columnGap: 2, height: 4, marginTop: 14 }}>
              {categorySegments.map((seg) => (
                <View key={seg.category} style={{ flex: seg.minor, backgroundColor: seg.color }} />
              ))}
            </View>
          ) : null}

          <View style={{ borderBottomWidth: 1, borderColor: c.ruleStrong, marginTop: 14 }}>
            <LedgerLine label="Charged so far" value={formatMoney(budgetForecast.committedMinor, homeCurrency)} />
            <LedgerLine
              label="Still to renew"
              sub={`${renewingThisWeek.length} THIS WEEK`}
              value={formatMoney(Math.max(0, budgetForecast.projectedMinor - budgetForecast.committedMinor), homeCurrency)}
            />
          </View>

          {/* budget — one honest ledger line, not a card */}
          <Pressable accessibilityRole="button" accessibilityLabel={budgetLine.a11y} onPress={() => router.push("/budget" as never)}>
            <LedgerLine label="Budget" sub={budgetLine.sub} value={budgetLine.value} valueColor={budgetLine.color} strong />
          </Pressable>
        </View>

        {/* Needs attention — still-charging + trials ending + price hikes */}
        {attentionSubs.length > 0 || endingTrials.length > 0 || priceHikes.length > 0 ? (
          <>
            <SectionTitle t={t}>Needs attention</SectionTitle>
            <View style={{ paddingHorizontal: 20 }}>
              {attentionSubs.slice(0, 3).map((sub) => (
                <AttentionRow
                  key={`attn-${sub.id}`}
                  t={t}
                  tone="danger"
                  icon={<AlertTriangle size={19} color={c.danger} strokeWidth={2} />}
                  title={`${sub.name} is still charging you`}
                  body="Cancelled, but a charge appeared — needs attention"
                  onPress={() => router.push(`/subscription/${sub.id}` as never)}
                />
              ))}
              {endingTrials.slice(0, 3).map((trial) => {
                const sub = trial.subscription;
                const label = trial.daysUntilEnd === 0 ? "today" : `in ${trial.daysUntilEnd} day${trial.daysUntilEnd === 1 ? "" : "s"}`;
                return (
                  <AttentionRow
                    key={`trial-${sub.id}`}
                    t={t}
                    tone="warning"
                    icon={<AlarmClock size={19} color={c.warning} strokeWidth={2} />}
                    title={`${sub.name} trial ends ${label}`}
                    body="Converts to paid — cancel before then?"
                    onPress={() => router.push(`/subscription/cancel/${sub.id}` as never)}
                  />
                );
              })}
              {priceHikes.slice(0, 3).map((hike) => {
                const sub = hike.subscription;
                return (
                  <AttentionRow
                    key={`hike-${sub.id}`}
                    t={t}
                    tone="info"
                    icon={<TrendingUp size={19} color={c.info} strokeWidth={2} />}
                    title={`${sub.name} went up ${hike.increasePct}%`}
                    body={`${formatMoney(hike.previousMinor, sub.price.currency)} → ${formatMoney(hike.currentMinor, sub.price.currency)}/mo`}
                    onPress={() => router.push(`/subscription/${sub.id}` as never)}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {/* Upcoming renewals */}
        <SectionTitle t={t} onSeeAll={() => router.push("/subscriptions" as never)}>
          Upcoming
        </SectionTitle>
        {/* Ledger rows on the paper itself — ruled, not boxed. */}
        <View style={{ paddingHorizontal: 6 }}>
          {upcoming.slice(0, 5).map((s, i, arr) => (
            <ListRow
              key={s.id}
              divider={i < arr.length - 1}
              leading={<ServiceAvatar name={s.name} />}
              title={s.name}
              subtitle={`${formatShortDate(s.nextRenewalDate, "—")} · ${categoryLabel(s.category).toUpperCase()}`}
              amount={formatMoney(s.price.amountMinor, s.price.currency)}
              cadence={CADENCE_SHORT[s.billingCycle]}
              chevron
              onPress={() => router.push(`/subscription/${s.id}` as never)}
            />
          ))}
        </View>

        {/* Ways to save */}
        {allInsights.length > 0 ? (
          <>
            <SectionTitle t={t} onSeeAll={() => router.push("/analytics")} seeAllLabel="MORE ↗">
              Ways to save
            </SectionTitle>
            <View style={{ paddingHorizontal: 20 }}>
              {savingOpportunity > 20 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`You could save ${currencySymbol(homeCurrency)}${savingOpportunity.toFixed(0)} a month. See how.`}
                  onPress={() => router.push("/analytics")}
                >
                  {/* the one money-positive figure on the page reads green */}
                  <LedgerLine
                    label="Could stop paying"
                    sub="ACROSS YOUR LEDGER"
                    value={`${currencySymbol(homeCurrency)}${savingOpportunity.toFixed(0)}/mo`}
                    valueColor={c.accentText}
                    strong
                  />
                </Pressable>
              ) : null}
              {previewInsights.map((insight) => (
                <Pressable key={insight.id} accessibilityRole="button" accessibilityLabel={`${insight.title}. ${insight.message}`} onPress={() => router.push("/analytics")}>
                  <LedgerLine label={insight.title} value="REVIEW" valueColor={c.textSecondary} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {/* Primary actions */}
        <View style={{ flexDirection: "row", columnGap: 10, paddingHorizontal: 16, paddingTop: 20 }}>
          <Button variant="primary" size="lg" onPress={() => router.push("/discover")} style={{ flex: 1 }} leftIcon={<Search size={18} color={c.textOnInk} strokeWidth={2} />}>
            Discover
          </Button>
          <Button variant="secondary" size="lg" onPress={() => router.push("/subscription/add")} style={{ flex: 1 }} leftIcon={<Plus size={18} color={c.textPrimary} strokeWidth={2} />}>
            Add
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

/** Ledger column head: caps-mono label, trailing hairline, optional link. */
function SectionTitle({ t, children, onSeeAll, seeAllLabel = "ALL ↗" }: { t: ReturnType<typeof useZenoTokens>; children: string; onSeeAll?: () => void; seeAllLabel?: string }) {
  return (
    <SectionHead
      right={
        onSeeAll ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`See all ${children}`} onPress={onSeeAll} hitSlop={8}>
            <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 9.5, letterSpacing: 1.3, color: t.color.accentText }}>{seeAllLabel}</Text>
          </Pressable>
        ) : undefined
      }
    >
      {children}
    </SectionHead>
  );
}

function AttentionRow({
  t,
  tone,
  icon,
  title,
  body,
  onPress
}: {
  t: ReturnType<typeof useZenoTokens>;
  tone: "warning" | "danger" | "info" | "accent";
  icon: ReactNode;
  title: string;
  body: string;
  onPress: () => void;
}) {
  const c = t.color;
  // A ruled row with a colored MARGIN TICK — the annotation a bookkeeper makes
  // in the margin — rather than a tinted tile in a rounded card.
  const tick = tone === "warning" ? c.warning : tone === "danger" ? c.stampAlert : tone === "info" ? c.info : c.stampVerified;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        columnGap: 12,
        minHeight: 48,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderColor: c.rule,
        backgroundColor: pressed ? c.surfaceSunken : "transparent"
      })}
    >
      <View style={{ width: 3, alignSelf: "stretch", backgroundColor: tick, borderRadius: 2 }} />
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontFamily: t.fonts.sans.semibold, fontSize: 14.5, color: c.textPrimary, letterSpacing: -0.14 }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: t.fonts.mono.regular, fontSize: 9.5, letterSpacing: 0.8, color: c.textTertiary, marginTop: 3, textTransform: "uppercase" }}>{body}</Text>
      </View>
      <ChevronRight size={16} color={c.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}
