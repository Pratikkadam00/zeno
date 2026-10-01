import { buildMonthlySpendHistory } from "@zeno/shared";
import { router, Stack } from "expo-router";
import { Share2, X } from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, LedgerLine, SectionHead, Stamp } from "../src/components/zeno";
import { useBudgetStore } from "../src/data/budget-store";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTokens } from "../src/theme/useZenoTokens";
import { currencySymbol, formatMoney } from "../src/utils/format";
import { shareText } from "../src/utils/share";
import { recordFunnelEvent } from "../src/api/client";
import { budgetRecap } from "../src/finance/budget";

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

  const history = buildMonthlySpendHistory(subscriptions, 6, undefined, fx);
  const capMinor = config.capMinor ?? 0;
  // F143: the most recent complete month that began after the cap was set
  // (src/finance/budget.ts), never a month from before any budget existed.
  const result = config.capMinor == null ? null : budgetRecap(history, capMinor, config.capSetAt);
  const recapIndex = result?.recapIndex ?? -1;
  const recap = result ? history[recapIndex] : undefined;
  const prev = result ? history[recapIndex - 1] : undefined;
  const streak = result?.streak ?? 0;

  const Header = (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
      <Text style={{ flex: 1, fontFamily: t.fonts.sans.semibold, fontSize: 17, color: c.textPrimary, paddingLeft: 8 }}>
        {recap ? `${recap.label} recap` : "Recap"}
      </Text>
      <Button variant="ghost" size="sm" accessibilityLabel="Close" onPress={() => router.back()}>
        <X size={20} color={c.textSecondary} strokeWidth={2} />
      </Button>
    </View>
  );

  if (!recap) {
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

  // Streak = retention mechanic + recurring share trigger (3.3). Only worth
  // sharing once it's a genuine streak, matching the badge's own threshold.
  const shareStreak = () => {
    recordFunnelEvent("share_card_generated", "budget_streak");
    return shareText(`I've stayed under my subscription budget for ${streak} months straight.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      {Header}

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* The month, stamped. The stamp IS the celebration — no confetti, no
            party icon, no green banner (all three named in the DS slop audit). */}
        <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 6 }}>
          <Stamp
            animate
            size="lg"
            angle={-5}
            tone={under ? "verified" : "alert"}
            sub={`CAP ${dollarsRound(capMinor)} · EST. ${money(recap.amountMinor)}`}
          >
            {under ? "Under cap" : "Over cap"}
          </Stamp>
          {/* Streak as TALLY MARKS — the way a ledger counts. */}
          {under && streak > 1 ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", columnGap: 4, marginTop: 16 }}
              accessible
              accessibilityLabel={`${streak} month streak under cap`}
            >
              {Array.from({ length: Math.min(streak, 12) }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 2.5,
                    height: 16,
                    backgroundColor: c.stampVerified,
                    // every fifth mark strikes across the previous four
                    transform: [{ rotate: (i + 1) % 5 === 0 ? "-68deg" : "0deg" }],
                    marginLeft: (i + 1) % 5 === 0 ? -14 : 0
                  }}
                />
              ))}
              <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10, letterSpacing: 1.2, color: c.textTertiary, marginLeft: 8 }}>
                {streak} MONTHS
              </Text>
            </View>
          ) : null}
        </View>

        {/* The month's arithmetic, as ledger lines under a rule. */}
        <View style={{ borderTopWidth: 1, borderColor: c.ruleStrong, marginTop: 14 }}>
          <LedgerLine label="The cap" value={dollarsRound(capMinor)} />
          <LedgerLine
            // F143: an estimate from the renewals Zeno tracks (no bank data), not
            // what was "actually spent", as it said.
            label="Estimated spend"
            value={money(recap.amountMinor)}
            valueColor={under ? c.stampVerified : c.stampAlert}
            strong
          />
          <LedgerLine label="Margin" value={`${under ? "−" : "+"}${money(diffMinor)}`} />
          {prev ? (
            <LedgerLine
              label={`vs ${prev.label}`}
              value={`${recap.amountMinor < prev.amountMinor ? "▼" : "▲"} ${money(Math.abs(recap.amountMinor - prev.amountMinor))}`}
            />
          ) : null}
        </View>

        <SectionHead style={{ paddingHorizontal: 0 }}>Six months vs the cap</SectionHead>
        <View>
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
        </View>

        {/* F146: a row here said "Budget adherence rolls into your Year in Review"
            with a Pro badge. Year in Review (app/wrapped.tsx) reads no budget
            and checks no plan; the row is gone until that exists. */}
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
