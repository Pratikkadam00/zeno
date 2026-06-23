import type { BillingCycle, SubscriptionCategory } from "@zeno/shared";
import { router, Stack } from "expo-router";
import { AlarmClock, AlertTriangle, Bell, ChevronRight, Plus, Radar, Search, TrendingUp, User } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../src/auth/authStore";
import { checkStatus } from "../../src/billing/revenueCat";
import { AmountDisplay, Button, Card, ListRow, ServiceAvatar } from "../../src/components/zeno";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { generateInsights, getTotalSavingOpportunity } from "../../src/insights/insightsEngine";
import { useZenoTokens } from "../../src/theme/useZenoTokens";
import { formatMoney } from "../../src/utils/format";
import { formatShortDate, getDaysRemaining } from "../../src/utils/subscription-ui";

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

function categoryLabel(category: SubscriptionCategory): string {
  if (category === "ai_tools") return "AI tools";
  const spaced = category.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function DashboardScreen() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();
  const { subscriptions, totalMonthlyMinor, upcoming, endingTrials, priceHikes } = useSubscriptionStore();
  const { plan, setPlan } = useAuthStore();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const allInsights = generateInsights(subscriptions);
  const savingOpportunity = getTotalSavingOpportunity(allInsights);
  const previewInsights = allInsights
    .filter((i) => i.type !== "spend_summary")
    .filter((i) => !dismissed.includes(i.id))
    .slice(0, 2);

  const attentionSubs = subscriptions.filter((s) => s.status === "attention");
  const trackedCount = subscriptions.filter((s) => s.status !== "cancelled").length;
  const renewingThisWeek = upcoming.filter((s) => {
    const d = getDaysRemaining(s.nextRenewalDate);
    return d !== null && d <= 7;
  });

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

  const Header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => router.push("/settings")}
        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceSunken, alignItems: "center", justifyContent: "center" }}
      >
        <User size={19} color={c.textSecondary} strokeWidth={2} />
      </Pressable>
      <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 30, letterSpacing: 30 * t.letterSpacing.tight, color: c.textPrimary }}>Home</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        onPress={() => router.push("/notifications" as never)}
        style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
      >
        <Bell size={20} color={c.textSecondary} strokeWidth={2} />
      </Pressable>
    </View>
  );

  if (!hasData) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        {Header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, paddingBottom: 40 }}>
          <View style={{ width: 64, height: 64, borderRadius: t.radius.xl, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Radar size={30} color={c.accentText} strokeWidth={2} />
          </View>
          <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 22, color: c.textPrimary, marginBottom: 6, textAlign: "center" }}>
            Let's find what you're paying for
          </Text>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 15, color: c.textSecondary, lineHeight: 22, textAlign: "center", marginBottom: 24 }}>
            Nothing tracked yet. Run your first free scan — no bank login, processed on your device.
          </Text>
          <Button variant="primary" size="lg" fullWidth onPress={() => router.push("/discover")} leftIcon={<Search size={18} color={c.textOnAccent} strokeWidth={2} />}>
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
        {/* Spend summary — solid ink contrast surface */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <View style={[{ backgroundColor: t.palette.ink[900], borderRadius: t.radius["2xl"], paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 }, t.shadow.lg]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.bodySm, color: t.palette.ink[300], letterSpacing: t.letterSpacing.wide, textTransform: "uppercase" }}>
                Active this month
              </Text>
              {plan === "free" ? (
                <Text style={{ fontFamily: t.fonts.mono.semibold, fontSize: t.fontSize.caption, color: t.palette.ink[300] }}>
                  {trackedCount}/{FREE_LIMIT} tracked
                </Text>
              ) : null}
            </View>
            <View style={{ marginTop: 10 }}>
              <AmountDisplay amount={totalMonthlyMinor / 100} size="xl" color="#FFFFFF" />
            </View>
            {plan === "free" ? (
              <>
                <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 3, marginTop: 16, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(100, (trackedCount / FREE_LIMIT) * 100)}%`, height: "100%", backgroundColor: t.palette.green[400], borderRadius: 3 }} />
                </View>
                <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.caption, color: t.palette.ink[400], marginTop: 8 }}>
                  Free plan · {Math.max(0, FREE_LIMIT - trackedCount)} slots left
                </Text>
              </>
            ) : (
              <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.caption, color: t.palette.ink[400], marginTop: 12 }}>
                {subscriptions.length} subscriptions · {renewingThisWeek.length} renewing this week
              </Text>
            )}
          </View>
        </View>

        {/* Needs attention — still-charging + trials ending + price hikes */}
        {attentionSubs.length > 0 || endingTrials.length > 0 || priceHikes.length > 0 ? (
          <>
            <SectionTitle t={t}>Needs attention</SectionTitle>
            <View style={{ paddingHorizontal: 16, rowGap: 8 }}>
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
          Upcoming renewals
        </SectionTitle>
        <View style={{ paddingHorizontal: 16 }}>
          <Card padding="none">
            {upcoming.slice(0, 5).map((s, i, arr) => (
              <ListRow
                key={s.id}
                divider={i < arr.length - 1}
                leading={<ServiceAvatar name={s.name} />}
                title={s.name}
                subtitle={`${categoryLabel(s.category)} · ${formatShortDate(s.nextRenewalDate, "—")}`}
                amount={formatMoney(s.price.amountMinor, s.price.currency)}
                cadence={CADENCE_SHORT[s.billingCycle]}
                chevron
                onPress={() => router.push(`/subscription/${s.id}` as never)}
              />
            ))}
          </Card>
        </View>

        {/* Ways to save */}
        {allInsights.length > 0 ? (
          <>
            <SectionTitle t={t} onSeeAll={() => router.push("/analytics")}>
              Ways to save
            </SectionTitle>
            <View style={{ paddingHorizontal: 16, rowGap: 8 }}>
              {savingOpportunity > 20 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/analytics")}
                  style={{ backgroundColor: c.successSoft, borderRadius: t.radius.lg, padding: 12 }}
                >
                  <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.bodySm, color: c.success, lineHeight: 18 }}>
                    You could save ${savingOpportunity.toFixed(0)}/mo — tap to see how
                  </Text>
                </Pressable>
              ) : null}
              {previewInsights.map((insight) => (
                <AttentionRow
                  key={insight.id}
                  t={t}
                  tone="accent"
                  icon={<TrendingUp size={19} color={c.accentText} strokeWidth={2} />}
                  title={insight.title}
                  body={insight.message}
                  onPress={() => router.push("/analytics")}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Primary actions */}
        <View style={{ flexDirection: "row", columnGap: 10, paddingHorizontal: 16, paddingTop: 20 }}>
          <Button variant="primary" size="lg" onPress={() => router.push("/discover")} style={{ flex: 1 }} leftIcon={<Search size={18} color={c.textOnAccent} strokeWidth={2} />}>
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

function SectionTitle({ t, children, onSeeAll }: { t: ReturnType<typeof useZenoTokens>; children: string; onSeeAll?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10 }}>
      <Text style={{ fontFamily: t.fonts.display.bold, fontSize: t.fontSize.title, color: t.color.textPrimary }}>{children}</Text>
      {onSeeAll ? (
        <Pressable accessibilityRole="button" onPress={onSeeAll}>
          <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.bodySm, color: t.color.accentText }}>See all</Text>
        </Pressable>
      ) : null}
    </View>
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
  const tile = tone === "warning" ? c.warningSoft : tone === "danger" ? c.dangerSoft : tone === "info" ? c.infoSoft : c.accentSoft;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", columnGap: 12, backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.borderSubtle, borderRadius: t.radius.lg, paddingHorizontal: 14, paddingVertical: 12, opacity: pressed ? 0.9 : 1 },
        t.shadow.xs
      ]}
    >
      <View style={{ width: 38, height: 38, borderRadius: t.radius.md, backgroundColor: tile, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.body, color: c.textPrimary }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.bodySm, color: c.textTertiary, marginTop: 1 }}>{body}</Text>
      </View>
      <ChevronRight size={17} color={c.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}
