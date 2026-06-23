import { router, Stack } from "expo-router";
import { AlarmClock, AlertTriangle, Bell, BellOff, ChevronLeft, Clock, TrendingUp } from "lucide-react-native";
import type { ComponentType, ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, ListRow } from "../src/components/zeno";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTokens } from "../src/theme/useZenoTokens";
import { formatMoney, notificationLabel } from "../src/utils/format";
import { formatShortDate } from "../src/utils/subscription-ui";

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// A small icon tile used as ListRow leading.
function tile(Icon: IconCmp, color: string, bg: string, radius: number): ReactNode {
  return (
    <View style={{ width: 38, height: 38, borderRadius: radius, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Icon size={19} color={color} strokeWidth={2} />
    </View>
  );
}

export default function NotificationsScreen() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();
  const { subscriptions, reminderPlan, endingTrials, priceHikes } = useSubscriptionStore();

  const attention = subscriptions.filter((s) => s.status === "attention");
  const pending = subscriptions.filter((s) => s.status === "pending");

  const flagsCount = attention.length + pending.length + endingTrials.length + priceHikes.length;
  const hasAny = flagsCount > 0 || reminderPlan.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 }}>
          <ChevronLeft size={22} color={c.accent} strokeWidth={2} />
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 17, color: c.accent }}>Back</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontFamily: t.fonts.sans.semibold, fontSize: 17, color: c.textPrimary }}>Notifications</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      {!hasAny ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, paddingBottom: 60 }}>
          <BellOff size={30} color={c.textTertiary} strokeWidth={2} />
          <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.body, color: c.textSecondary, marginTop: 12 }}>No alerts yet</Text>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.bodySm, color: c.textTertiary, textAlign: "center", marginTop: 4 }}>
            We&apos;ll flag renewals, free trials, price changes, and cancellation results here.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
          {/* Flags — things that need a look */}
          {flagsCount > 0 ? (
            <>
              <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.micro, letterSpacing: t.letterSpacing.caps, textTransform: "uppercase", color: c.textTertiary, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 8 }}>
                Flags
              </Text>
              <Card padding="none">
                {attention.map((s, i, arr) => (
                  <ListRow
                    key={`attn-${s.id}`}
                    divider={i < arr.length - 1 || pending.length > 0 || endingTrials.length > 0 || priceHikes.length > 0}
                    leading={tile(AlertTriangle, c.danger, c.dangerSoft, t.radius.md)}
                    title={`${s.name} is still charging you`}
                    subtitle="Cancelled, but a charge appeared — needs attention"
                    chevron
                    onPress={() => router.push(`/subscription/${s.id}` as never)}
                  />
                ))}
                {pending.map((s, i, arr) => (
                  <ListRow
                    key={`pend-${s.id}`}
                    divider={i < arr.length - 1 || endingTrials.length > 0 || priceHikes.length > 0}
                    leading={tile(Clock, c.info, c.infoSoft, t.radius.md)}
                    title={`Verifying ${s.name} cancellation`}
                    subtitle={`We'll confirm around ${formatShortDate(s.cancellationVerifyBy ?? s.nextRenewalDate)}`}
                    chevron
                    onPress={() => router.push(`/subscription/${s.id}` as never)}
                  />
                ))}
                {endingTrials.map((trial, i, arr) => (
                  <ListRow
                    key={`trial-${trial.subscription.id}`}
                    divider={i < arr.length - 1 || priceHikes.length > 0}
                    leading={tile(AlarmClock, c.warning, c.warningSoft, t.radius.md)}
                    title={`${trial.subscription.name} trial ends ${trial.daysUntilEnd === 0 ? "today" : `in ${trial.daysUntilEnd} day${trial.daysUntilEnd === 1 ? "" : "s"}`}`}
                    subtitle={`Converts to ${formatMoney(trial.subscription.price.amountMinor, trial.subscription.price.currency)} — cancel before then?`}
                    chevron
                    onPress={() => router.push(`/subscription/cancel/${trial.subscription.id}` as never)}
                  />
                ))}
                {priceHikes.map((hike, i, arr) => (
                  <ListRow
                    key={`hike-${hike.subscription.id}`}
                    divider={i < arr.length - 1}
                    leading={tile(TrendingUp, c.info, c.infoSoft, t.radius.md)}
                    title={`${hike.subscription.name} went up ${hike.increasePct}%`}
                    subtitle={`${formatMoney(hike.previousMinor, hike.subscription.price.currency)} → ${formatMoney(hike.currentMinor, hike.subscription.price.currency)}/mo`}
                    chevron
                    onPress={() => router.push(`/subscription/${hike.subscription.id}` as never)}
                  />
                ))}
              </Card>
            </>
          ) : null}

          {/* Scheduled reminders */}
          {reminderPlan.length > 0 ? (
            <>
              <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.micro, letterSpacing: t.letterSpacing.caps, textTransform: "uppercase", color: c.textTertiary, paddingHorizontal: 4, paddingTop: 22, paddingBottom: 8 }}>
                Upcoming reminders
              </Text>
              <Card padding="none">
                {reminderPlan.slice(0, 12).map((plan, i, arr) => (
                  <ListRow
                    key={`${plan.subscriptionId}-${plan.kind}-${i}`}
                    divider={i < arr.length - 1}
                    leading={tile(Bell, c.accent, c.accentSoft, t.radius.md)}
                    title={`${notificationLabel(plan.kind)} — ${plan.serviceName}`}
                    subtitle={new Date(plan.triggerAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    chevron
                    onPress={() => router.push(`/subscription/${plan.subscriptionId}` as never)}
                  />
                ))}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
