import { buildMonthlySpendHistory } from "@zeno/shared";
import { router, Stack } from "expo-router";
import { AlertTriangle, Flame, Gift, PartyPopper, Share2, X } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, Button, Card } from "../src/components/zeno";
import { useBudgetStore } from "../src/data/budget-store";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTokens } from "../src/theme/useZenoTokens";
import { currencySymbol, formatMoney } from "../src/utils/format";
import { shareText } from "../src/utils/share";

export default function BudgetRecapScreen() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();
  const { subscriptions, homeCurrency, fx } = useSubscriptionStore();
  const { config } = useBudgetStore();

  // Aggregate monthly-spend-history figures — shown in the home-currency
  // setting (Settings > Home currency), converted via fx when a rate table is
  // available (see budget.tsx for the same convention).
  const money = (minor: number) => formatMoney(minor, homeCurrency);
  const dollarsRound = (minor: number) => `${currencySymbol(homeCurrency)}${Math.round(minor / 100)}`;

  const history = buildMonthlySpendHistory(subscriptions, 6, undefined, fx).map((point) => ({ label: point.label, amountMinor: point.amountMinor }));
  // Recap the most recent COMPLETE month (the current month is still partial).
  const recapIndex = history.length >= 2 ? history.length - 2 : history.length - 1;
  const recap = history[recapIndex];
  const prev = history[recapIndex - 1];
  const capMinor = config.capMinor ?? 0;

  const Header = (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
      <Text style={{ flex: 1, fontFamily: t.fonts.sans.semibold, fontSize: 17, color: c.textPrimary, paddingLeft: 8 }}>
        {recap ? `${recap.label} recap` : "Recap"}
      </Text>
      <Button variant="ghost" size="sm" onPress={() => router.back()}>
        <X size={20} color={c.textSecondary} strokeWidth={2} />
      </Button>
    </View>
  );

  if (!recap || config.capMinor == null) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        {Header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 15, color: c.textTertiary, textAlign: "center" }}>
            We&apos;ll show a recap once you&apos;ve set a budget and tracked a full month.
          </Text>
        </View>
      </View>
    );
  }

  const under = recap.amountMinor <= capMinor;
  const diffMinor = Math.abs(capMinor - recap.amountMinor);
  const maxMinor = Math.max(...history.map((h) => h.amountMinor), capMinor, 1);

  // Consecutive complete months (back from the recap month) that stayed under cap.
  let streak = 0;
  for (let i = recapIndex; i >= 0; i--) {
    if (history[i].amountMinor <= capMinor) streak++;
    else break;
  }

  // Streak = retention mechanic + recurring share trigger (3.3). Only worth
  // sharing once it's a genuine streak, matching the badge's own threshold.
  const shareStreak = () => shareText(
    `I've stayed under my subscription budget for ${streak} months straight.`
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      {Header}

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* Verdict hero */}
        <View style={[{ backgroundColor: under ? c.accent : t.palette.ink[900], borderRadius: t.radius["2xl"], padding: 26, alignItems: "center" }, under ? t.shadow.accent : t.shadow.lg]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: under ? "rgba(10,42,28,0.18)" : c.dangerSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            {under ? <PartyPopper size={28} color={t.palette.ink[900]} strokeWidth={2} /> : <AlertTriangle size={28} color={c.danger} strokeWidth={2} />}
          </View>
          <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 24, letterSpacing: -0.5, color: under ? t.palette.ink[900] : "#FFFFFF" }}>
            {under ? "You stayed under!" : "You went over"}
          </Text>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 14.5, marginTop: 6, textAlign: "center", color: under ? t.palette.ink[800] : t.palette.ink[300] }}>
            {money(diffMinor)} {under ? "under" : "over"} your {dollarsRound(capMinor)} cap in {recap.label}.
          </Text>
          {under && streak > 1 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, paddingHorizontal: 12, paddingVertical: 5, borderRadius: t.radius.pill, backgroundColor: "rgba(10,42,28,0.16)" }}>
              <Flame size={14} color={t.palette.ink[900]} strokeWidth={2} />
              <Text style={{ fontFamily: t.fonts.sans.bold, fontSize: 12.5, color: t.palette.ink[900] }}>{streak}-month streak</Text>
            </View>
          ) : null}
        </View>

        {/* Cap vs actual + trend */}
        <Card padding="md" style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <Stat t={t} label="Budget" value={dollarsRound(capMinor)} />
            <Stat t={t} label="Actual" value={money(recap.amountMinor)} accent={under} />
            <Stat t={t} label={prev ? `vs ${prev.label}` : "vs prev"} value={prev ? `${recap.amountMinor < prev.amountMinor ? "−" : "+"}${money(Math.abs(recap.amountMinor - prev.amountMinor))}` : "—"} />
          </View>
          {/* Trend bars with cap line */}
          <View style={{ height: 96, flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 6 }}>
            <View style={{ position: "absolute", left: 0, right: 0, top: 6 + (1 - capMinor / maxMinor) * 84, borderTopWidth: 1.5, borderTopColor: c.borderStrong, borderStyle: "dashed" }} />
            {history.map((h, i) => {
              const barH = Math.max(4, (h.amountMinor / maxMinor) * 84);
              const over = h.amountMinor > capMinor;
              const isRecap = i === recapIndex;
              return (
                <View key={`${h.label}-${i}`} style={{ flex: 1, alignItems: "center", rowGap: 5 }}>
                  <View style={{ width: "100%", maxWidth: 26, height: barH, backgroundColor: over ? c.danger : isRecap ? c.accent : c.accentSoft2, borderRadius: t.radius.sm }} />
                  <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 10.5, color: c.textTertiary }}>{h.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.accentSoft, borderRadius: t.radius.md }}>
          <Gift size={17} color={c.accentText} strokeWidth={2} />
          <Text style={{ flex: 1, fontFamily: t.fonts.sans.regular, fontSize: 12.5, color: c.textSecondary }}>Budget adherence rolls into your Year in Review.</Text>
          <Badge tone="accent">Pro</Badge>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 + insets.bottom, gap: 10 }}>
        {under && streak > 1 ? (
          <Button variant="secondary" size="lg" fullWidth onPress={() => void shareStreak()}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Share2 size={16} color={c.textPrimary} strokeWidth={2} />
              <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 15, color: c.textPrimary }}>Share my {streak}-month streak</Text>
            </View>
          </Button>
        ) : null}
        <Button variant="primary" size="lg" fullWidth onPress={() => router.back()}>Done</Button>
      </View>
    </View>
  );
}

function Stat({ t, label, value, accent }: { t: ReturnType<typeof useZenoTokens>; label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 17, color: accent ? t.color.accentText : t.color.textPrimary }}>{value}</Text>
      <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 11, letterSpacing: t.letterSpacing.wide, textTransform: "uppercase", color: t.color.textTertiary, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
