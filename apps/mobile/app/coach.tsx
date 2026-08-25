import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { createSpendSummary, monthlyAmount, monthlyAmountIn } from "@zeno/shared";
import { PenLine } from "lucide-react-native";
import { Button } from "../src/components/zeno";
import { fonts } from "../src/theme/zeno";
import { getAiCoaching, type AiCoaching } from "../src/api/client";
import { useBudgetStore } from "../src/data/budget-store";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { budgetStatus, computeBudgetForecast } from "../src/finance/budget";
import { formatMoney } from "../src/utils/format";
import { useZenoTheme } from "../src/theme/theme-provider";

const NEWLINE = String.fromCharCode(10);

/**
 * A block of the coach's page: paper with a hairline rule frame and no resting
 * shadow (the Honest Ledger card rule). Local to this screen so it no longer
 * depends on the legacy src/components/ui kit.
 */
function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useZenoTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.rule, borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 12 }, style]}>
      {children}
    </View>
  );
}

export default function CoachScreen() {
  const { theme } = useZenoTheme();
  const { spendSummary, subscriptions, totalMonthlyMinor, homeCurrency, fx, coachAiConsent, setCoachAiConsent } = useSubscriptionStore();
  const { config: budgetConfig } = useBudgetStore();
  const money = (minor: number) => formatMoney(minor, homeCurrency);
  const aiConsented = coachAiConsent === "granted";

  const [ai, setAi] = useState<AiCoaching | null>(null);
  const [loadingAi, setLoadingAi] = useState(true);

  // Deterministic, budget-aware coaching that needs no AI key: forecast vs cap,
  // and the cheapest cuts that get the user back under.
  const budgetAdvice = useMemo(() => {
    const capMinor = budgetConfig.capMinor;
    if (capMinor == null) return null;
    const forecast = computeBudgetForecast(subscriptions, undefined, fx);
    const status = budgetStatus(forecast.projectedMinor, capMinor);
    const overByMinor = Math.max(0, forecast.projectedMinor - capMinor);
    const cuts: { name: string; monthlyMinor: number }[] = [];
    if (overByMinor > 0) {
      // Same fx conversion as the forecast above — otherwise a mixed-currency
      // portfolio would compare cut candidates in native-currency minor units
      // against a home-currency-converted overByMinor.
      const cheapest = subscriptions
        .filter((s) => s.status === "active")
        .map((s) => ({ name: s.name, monthlyMinor: fx ? monthlyAmountIn(s, fx.homeCurrency, fx.rates) : monthlyAmount(s) }))
        .filter((candidate): candidate is { name: string; monthlyMinor: number } => candidate.monthlyMinor !== null)
        .sort((a, b) => a.monthlyMinor - b.monthlyMinor);
      let accumulated = 0;
      for (const candidate of cheapest) {
        if (accumulated >= overByMinor) break;
        cuts.push(candidate);
        accumulated += candidate.monthlyMinor;
      }
    }
    return { capMinor, projectedMinor: forecast.projectedMinor, status, overByMinor, cuts };
  }, [budgetConfig.capMinor, subscriptions, fx]);

  useEffect(() => {
    let active = true;
    // Consent gate (P2.2): the coach must never transmit the subscription list
    // to the server until the user has explicitly opted in. Until then, clear
    // any stale AI result and show only the on-device deterministic sections.
    if (!aiConsented) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAi(null);
      setLoadingAi(false);
      return () => { active = false; };
    }
    // Deliberate: this kicks off an async fetch, so the loading flag must
    // flip synchronously at the start of the effect, not in a derived value.
    setLoadingAi(true);
    // Gmail-derived data must not flow to a third-party AI model (Google API
    // Services User Data Policy, Limited Use). Exclude email-sourced items from
    // the transmitted payload — and recompute the total from the same filtered
    // set so the transmitted aggregate can't leak a Gmail-derived amount either.
    // The on-device sections below still use the full portfolio.
    const shareable = subscriptions.filter((subscription) => subscription.status === "active" && subscription.source !== "email");
    const shareableSubscriptions = shareable.map((subscription) => ({
      name: subscription.name,
      category: subscription.category,
      monthlyMinor: monthlyAmount(subscription),
      billingCycle: subscription.billingCycle
    }));
    const shareableTotalMinor = shareableSubscriptions.reduce((sum, subscription) => sum + (subscription.monthlyMinor ?? 0), 0);
    // Insights are recomputed over the SAME shareable set — the store's
    // spendSummary.insights is built from the full portfolio and its titles/
    // bodies embed subscription names and amounts (e.g. "Check annual pricing
    // for Netflix"), which would re-introduce Gmail-derived data into the
    // transmitted payload that payload.subscriptions above just excluded.
    const shareableSummary = createSpendSummary(shareable, new Date(), fx);
    const payload = {
      totalMonthlyMinor: shareableTotalMinor,
      currency: homeCurrency,
      subscriptions: shareableSubscriptions,
      insights: shareableSummary.insights.map((insight) => ({ title: insight.title, body: insight.body })),
      ...(budgetConfig.capMinor != null ? { budgetCapMinor: budgetConfig.capMinor } : {})
    };
    void getAiCoaching(payload)
      // On any non-ok result (offline / server / auth) fall back to the on-device
      // deterministic sections below — same graceful degradation as before, now
      // without collapsing every failure into an ambiguous null.
      .then((result) => { if (active) setAi(result.ok ? result.data : null); })
      .finally(() => { if (active) setLoadingAi(false); });
    return () => { active = false; };
  }, [aiConsented, subscriptions, homeCurrency, fx, budgetConfig.capMinor]);

  const aiActive = ai?.source === "ai";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>AI spend coach</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            {!aiConsented
              ? "Deterministic insights, computed entirely on your device."
              : aiActive
                ? "Personalized coaching from your configured AI model, grounded in your subscriptions."
                : "Deterministic insights computed on-device. Add an AI key on the server to unlock personalized coaching."}
          </Text>
          <Text style={{ color: theme.quietText, marginTop: 6, fontSize: 12 }}>
            General information, not financial advice.
          </Text>
        </View>

        {!aiConsented ? (
          /* Consent as a short agreement you actually read — numbered clauses on
             ruled paper, not an AI-gradient card. The legally-reviewed sentence
             below is preserved VERBATIM; only its presentation changed. */
          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            <PenLine size={26} color={theme.mutedText} strokeWidth={2} />
            <Text style={{ fontFamily: fonts.display.bold, fontSize: 23, letterSpacing: -0.5, color: theme.text, marginTop: 12, marginBottom: 8, lineHeight: 27 }}>
              {coachAiConsent === "declined" ? "AI coaching is off." : "Coaching is optional."}{NEWLINE}Here&apos;s the deal.
            </Text>
            <View style={{ borderTopWidth: 1, borderColor: theme.ruleStrong, marginTop: 8 }}>
              {[
                ["On-device by default", "Zeno's built-in insights run right here. Nothing is sent anywhere."],
                [
                  "AI coaching, only if you ask",
                  "To write personalized savings advice, Zeno sends your subscription names, categories and amounts to our server, which passes them to an AI model. We never send your bank login, card numbers, balances, or anything found in your email — and nothing is shared until you tap Enable."
                ],
                ["Revocable", "Turn it off any time in Settings. Off means off."]
              ].map(([clauseTitle, clauseBody], i) => (
                <View key={clauseTitle} style={{ flexDirection: "row", columnGap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.rule }}>
                  <Text style={{ fontFamily: fonts.mono.bold, fontSize: 11, color: theme.quietText }}>{String(i + 1).padStart(2, "0")}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sans.bold, fontSize: 14.5, color: theme.text }}>{clauseTitle}</Text>
                    <Text style={{ fontFamily: fonts.sans.regular, fontSize: 13, color: theme.mutedText, marginTop: 3, lineHeight: 20 }}>{clauseBody}</Text>
                  </View>
                </View>
              ))}
            </View>
            {/* equal-weight choice — deliberately no dark pattern */}
            <View style={{ flexDirection: "row", columnGap: 10, marginTop: 18 }}>
              {coachAiConsent === "unset" ? (
                <Button variant="secondary" size="lg" accessibilityLabel="Not now, keep insights on-device" onPress={() => setCoachAiConsent("declined")} style={{ flex: 1 }}>
                  Not now
                </Button>
              ) : null}
              <Button variant="primary" size="lg" accessibilityLabel="Enable AI coaching" onPress={() => setCoachAiConsent("granted")} style={{ flex: 1 }}>
                Enable AI coaching
              </Button>
            </View>
            <Text style={{ fontFamily: fonts.mono.bold, fontSize: 9.5, letterSpacing: 1.2, color: theme.quietText, textAlign: "center", marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderColor: theme.rule }}>
              GENERAL INFORMATION, NOT FINANCIAL ADVICE.
            </Text>
          </View>
        ) : null}

        <Surface>
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>{money(totalMonthlyMinor)}</Text>
          <Text style={{ color: theme.mutedText, marginTop: 4 }}>Estimated monthly subscription spend</Text>
          {spendSummary.excludedCurrencyCount ? (
            <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 12 }}>
              {spendSummary.excludedCurrencyCount} subscription{spendSummary.excludedCurrencyCount > 1 ? "s" : ""} in other currencies not included.
            </Text>
          ) : null}
        </Surface>

        {budgetAdvice ? (
          <Surface>
            <Text style={{ color: theme.mutedText, fontSize: 12, fontWeight: "800", letterSpacing: 1 }}>YOUR BUDGET</Text>
            {budgetAdvice.overByMinor > 0 ? (
              <>
                <Text style={{ color: theme.text, marginTop: 8, fontSize: 16, lineHeight: 22 }}>
                  You&apos;re {money(budgetAdvice.overByMinor)} over your {money(budgetAdvice.capMinor)} budget (forecast {money(budgetAdvice.projectedMinor)}).
                </Text>
                {budgetAdvice.cuts.length > 0 ? (
                  <Text style={{ color: theme.secondary, marginTop: 8, fontWeight: "800" }}>
                    Cancel {budgetAdvice.cuts.map((cut) => cut.name).join(" + ")} → save {money(budgetAdvice.cuts.reduce((sum, cut) => sum + cut.monthlyMinor, 0))}/mo and get under.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={{ color: theme.text, marginTop: 8, fontSize: 16, lineHeight: 22 }}>
                On pace — forecast {money(budgetAdvice.projectedMinor)} of your {money(budgetAdvice.capMinor)} budget.
              </Text>
            )}
          </Surface>
        ) : null}

        {loadingAi ? (
          <Surface>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={theme.secondary} />
              <Text style={{ color: theme.mutedText }}>Asking your AI coach…</Text>
            </View>
          </Surface>
        ) : aiActive && ai.source === "ai" ? (
          <>
            {ai.summary ? (
              <Surface>
                <Text style={{ color: theme.mutedText, fontSize: 12, fontWeight: "800", letterSpacing: 1 }}>AI COACH</Text>
                <Text style={{ color: theme.text, marginTop: 8, fontSize: 16, lineHeight: 22 }}>{ai.summary}</Text>
              </Surface>
            ) : null}
            <View style={{ gap: 12 }}>
              {ai.recommendations.map((rec, index) => (
                <Surface key={`ai-${index}-${rec.title}`}>
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: "900" }}>{rec.title}</Text>
                  <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>{rec.detail}</Text>
                  {rec.estimatedMonthlySavingsLabel ? (
                    <Text style={{ color: theme.secondary, marginTop: 8, fontWeight: "800" }}>
                      Potential savings: {rec.estimatedMonthlySavingsLabel}
                    </Text>
                  ) : null}
                </Surface>
              ))}
            </View>
          </>
        ) : null}

        {spendSummary?.byCategory?.length ? (
          <>
            <Surface>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Category breakdown</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                {spendSummary.byCategory.map((row) => (
                  <View key={row.category} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>{row.category.replace("_", " ")}</Text>
                    <Text style={{ color: theme.mutedText, marginTop: 4 }}>{money(row.monthlyMinor)} · {row.count} active</Text>
                  </View>
                ))}
              </View>
            </Surface>

            <View style={{ gap: 12 }}>
              {!aiActive ? (
                <Text style={{ color: theme.mutedText, fontSize: 13, fontWeight: "800", letterSpacing: 1 }}>RULE-BASED INSIGHTS</Text>
              ) : null}
              {spendSummary.insights.map((insight) => (
                <Surface key={`${insight.kind}-${insight.title}`}>
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: "900" }}>{insight.title}</Text>
                  <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>{insight.body}</Text>
                  {insight.estimatedMonthlyImpactMinor ? (
                    <Text style={{ color: theme.secondary, marginTop: 8, fontWeight: "800" }}>
                      Potential impact: {money(insight.estimatedMonthlyImpactMinor)}/mo
                    </Text>
                  ) : null}
                </Surface>
              ))}
            </View>
          </>
        ) : (
          <Surface>
            <Text style={{ color: theme.mutedText, fontSize: 16 }}>No spending insights yet</Text>
          </Surface>
        )}
      </ScrollView>
    </View>
  );
}
