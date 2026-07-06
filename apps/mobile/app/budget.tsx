import type { SubscriptionCategory } from "@zeno/shared";
import { router, Stack } from "expo-router";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  History,
  Info,
  Lock,
  Minus,
  PieChart,
  Pencil,
  Plus,
  Scissors,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  Zap
} from "lucide-react-native";
import { useState, type ComponentType, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../src/auth/authStore";
import { AmountDisplay, Badge, Button, Card, IconButton, Input, ListRow, ServiceAvatar } from "../src/components/zeno";
import { useBudgetStore } from "../src/data/budget-store";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { budgetStatus, computeBudgetForecast, computeCategoryForecast, suggestedCapMinor, type BudgetStatus } from "../src/finance/budget";
import { useZenoTokens } from "../src/theme/useZenoTokens";
import { currencySymbol, formatMoney } from "../src/utils/format";
import { formatShortDate } from "../src/utils/subscription-ui";

function categoryLabel(category: SubscriptionCategory): string {
  if (category === "ai_tools") return "AI tools";
  const spaced = category.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function BudgetScreen() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();
  const { subscriptions, homeCurrency, fx } = useSubscriptionStore();
  const { config, setCap, setIncome, addEnvelope, logEnvelope, removeEnvelope, setCategoryCap } = useBudgetStore();
  const { plan } = useAuthStore();
  const isPro = plan === "pro" || plan === "family";

  // These two operate on aggregate budget figures (forecast/headroom, summed
  // across all the user's subscriptions) — shown in the home-currency setting
  // (Settings > Home currency), converted via fx when a rate table is
  // available. Per-subscription amounts below use formatMoney with that
  // subscription's own stored currency instead.
  const money = (minor: number) => formatMoney(minor, homeCurrency);
  const dollarsRound = (minor: number) => `${currencySymbol(homeCurrency)}${Math.round(minor / 100)}`;

  const forecast = computeBudgetForecast(subscriptions, undefined, fx);
  const { committedMinor, projectedMinor, remaining, daysLeftInMonth } = forecast;

  const [setupCapMinor, setSetupCapMinor] = useState(() => suggestedCapMinor(projectedMinor));
  const [incomeInput, setIncomeInput] = useState("");

  const statusColors: Record<BudgetStatus, { soft: string; main: string }> = {
    under: { soft: c.successSoft, main: c.success },
    approaching: { soft: c.warningSoft, main: c.warning },
    over: { soft: c.dangerSoft, main: c.danger }
  };

  const Header = ({ right }: { right?: ReactNode }) => (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => router.back()} style={{ width: 60 }}>
        <ChevronLeft size={24} color={c.accent} strokeWidth={2} />
      </Pressable>
      <Text style={{ flex: 1, textAlign: "center", fontFamily: t.fonts.sans.semibold, fontSize: 17, color: c.textPrimary }}>Budget</Text>
      <View style={{ width: 60, alignItems: "flex-end" }}>{right}</View>
    </View>
  );

  // ── No budget set: invite + zero-data setup ───────────────────────────────
  if (config.capMinor == null) {
    const headroom = setupCapMinor - projectedMinor;
    return (
      <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 + insets.bottom }}>
          <View style={{ width: 52, height: 52, borderRadius: t.radius.lg, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Target size={26} color={c.accentText} strokeWidth={2} />
          </View>
          <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 25, letterSpacing: -0.5, color: c.textPrimary, marginBottom: 8 }}>Set a recurring budget</Text>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 15, color: c.textSecondary, lineHeight: 22, marginBottom: 6 }}>
            No bank link needed. Zeno already knows your subscriptions and when they renew, so we can forecast your month from day one.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 }}>
            <Zap size={14} color={c.accentText} strokeWidth={2} />
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12.5, color: c.textTertiary }}>Based on your renewals — no import required.</Text>
          </View>

          {/* Live forecast preview */}
          <View style={{ backgroundColor: t.palette.ink[900], borderRadius: t.radius.xl, padding: 20, marginBottom: 18 }}>
            <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 12.5, color: t.palette.ink[300], letterSpacing: t.letterSpacing.wide, textTransform: "uppercase" }}>Forecast this month</Text>
            <View style={{ marginTop: 8 }}><AmountDisplay amount={projectedMinor / 100} size="lg" color="#FFFFFF" /></View>
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12.5, color: t.palette.ink[400], marginTop: 4 }}>
              {money(committedMinor)} charged · {money(projectedMinor - committedMinor)} still to renew
            </Text>
          </View>

          <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 12, letterSpacing: t.letterSpacing.caps, textTransform: "uppercase", color: c.textTertiary, marginBottom: 8 }}>Your monthly cap</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 12 }}>
            <IconButton variant="secondary" size={44} label="Lower cap" onPress={() => setSetupCapMinor((m) => Math.max(500, m - 500))}>
              <Minus size={20} color={c.textPrimary} strokeWidth={2} />
            </IconButton>
            <View style={{ minWidth: 120, alignItems: "center" }}><AmountDisplay amount={setupCapMinor / 100} size="lg" /></View>
            <IconButton variant="secondary" size={44} label="Raise cap" onPress={() => setSetupCapMinor((m) => m + 500)}>
              <Plus size={20} color={c.textPrimary} strokeWidth={2} />
            </IconButton>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setSetupCapMinor(suggestedCapMinor(projectedMinor))} style={{ alignSelf: "center", marginBottom: 6 }}>
            <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 13, color: c.accentText }}>Use suggested · {dollarsRound(suggestedCapMinor(projectedMinor))}</Text>
          </Pressable>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12, color: c.textTertiary, textAlign: "center" }}>
            {headroom < 0
              ? `That's below your ${dollarsRound(projectedMinor)} forecast — we'll warn you early.`
              : `${dollarsRound(headroom)} of headroom above your forecast.`}
          </Text>
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: c.borderSubtle, backgroundColor: c.surfaceCard }}>
          <Button variant="primary" size="lg" fullWidth onPress={() => setCap(setupCapMinor)}>Start tracking this budget</Button>
        </View>
      </View>
    );
  }

  // ── Budget set: forward-looking overview ──────────────────────────────────
  const capMinor = config.capMinor;
  const status = budgetStatus(projectedMinor, capMinor);
  const sc = statusColors[status];
  const headroomMinor = capMinor - projectedMinor;
  const pct = Math.min(100, capMinor > 0 ? (projectedMinor / capMinor) * 100 : 0);
  const committedPct = Math.min(100, capMinor > 0 ? (committedMinor / capMinor) * 100 : 0);
  const StatusIcon = status === "over" ? AlertTriangle : status === "approaching" ? TrendingUp : CircleCheck;
  const statusLabel = status === "over" ? "Over budget" : status === "approaching" ? "Approaching" : "On pace";

  const cutCandidates = subscriptions
    .filter((s) => s.status === "active")
    .sort((a, b) => a.price.amountMinor - b.price.amountMinor)
    .slice(0, 3);

  const categoryForecast = computeCategoryForecast(subscriptions, undefined, fx);
  const categoryRows = Object.entries(categoryForecast)
    .sort((a, b) => b[1] - a[1])
    .map(([category, projected]) => {
      const cap = config.categoryCaps.find((entry) => entry.category === category)?.capMinor ?? suggestedCapMinor(projected);
      return { category: category as SubscriptionCategory, projected, cap };
    });

  return (
    <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header right={<IconButton variant="ghost" size={40} label="Edit budget" onPress={() => setCap(null)}><Pencil size={20} color={c.textSecondary} strokeWidth={2} /></IconButton>} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 + insets.bottom }}>
        {/* Hero — forward-looking status */}
        <View style={[{ backgroundColor: t.palette.ink[900], borderRadius: t.radius["2xl"], padding: 22 }, t.shadow.lg]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 12.5, color: t.palette.ink[300], letterSpacing: t.letterSpacing.wide, textTransform: "uppercase" }}>Projected this month</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: t.radius.pill, backgroundColor: sc.soft }}>
              <StatusIcon size={13} color={sc.main} strokeWidth={2} />
              <Text style={{ fontFamily: t.fonts.sans.bold, fontSize: 12, color: sc.main }}>{statusLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 10 }}>
            <AmountDisplay amount={projectedMinor / 100} size="xl" color="#FFFFFF" />
            <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 15, color: t.palette.ink[400] }}>/ {dollarsRound(capMinor)}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 4, marginTop: 16, overflow: "hidden" }}>
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: status === "over" ? c.danger : status === "approaching" ? c.warning : t.palette.green[400], borderRadius: 4 }} />
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${committedPct}%`, backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 11.5, color: t.palette.ink[400] }}>{money(committedMinor)} charged</Text>
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 11.5, color: t.palette.ink[400] }}>{daysLeftInMonth} days left</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}>
            <Info size={13} color={t.palette.ink[400]} strokeWidth={2} />
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12, color: t.palette.ink[300] }}>Forecast from your renewal dates</Text>
          </View>
          {forecast.excludedCurrencyCount ? (
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 11.5, color: t.palette.ink[400], marginTop: 4 }}>
              {forecast.excludedCurrencyCount} subscription{forecast.excludedCurrencyCount > 1 ? "s" : ""} in other currencies not included above.
            </Text>
          ) : null}
        </View>

        {/* Get back under */}
        {(status === "over" || status === "approaching") && cutCandidates.length > 0 ? (
          <View style={{ marginTop: 14, borderWidth: 1, borderColor: sc.main, borderRadius: t.radius.lg, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: sc.soft, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Scissors size={18} color={sc.main} strokeWidth={2} />
              <Text style={{ flex: 1, fontFamily: t.fonts.sans.bold, fontSize: 14, color: c.textPrimary }}>
                {status === "over" ? `Cut ${money(Math.abs(headroomMinor))} to get back under` : "Trim now to stay under"}
              </Text>
            </View>
            <View style={{ backgroundColor: c.surfaceCard }}>
              {cutCandidates.map((s, i) => (
                <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.borderSubtle }}>
                  <ServiceAvatar name={s.name} size={34} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 14, color: c.textPrimary }}>{s.name}</Text>
                    <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 12, color: c.textTertiary }}>{formatMoney(s.price.amountMinor, s.price.currency)}/mo · {formatMoney(s.price.amountMinor * 12, s.price.currency)}/yr</Text>
                  </View>
                  <Button variant="secondary" size="sm" onPress={() => router.push(`/subscription/cancel/${s.id}` as never)}>Cancel</Button>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* AI coach tie-in */}
        <Pressable accessibilityRole="button" onPress={() => router.push("/coach")} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accentSoft2, borderRadius: t.radius.lg, paddingHorizontal: 15, paddingVertical: 13 }}>
          <Sparkles size={20} color={c.accentText} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 13.5, color: c.textPrimary }}>Ask the Spend Coach</Text>
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12, color: c.textSecondary }}>What to cut to hit {dollarsRound(capMinor)} — and how much it saves.</Text>
          </View>
          {!isPro ? <Badge tone="accent">Pro</Badge> : <ChevronRight size={18} color={c.textTertiary} strokeWidth={2} />}
        </Pressable>

        {/* Forecast — still to renew */}
        {remaining.length > 0 ? (
          <>
            <SectionLabel t={t} Icon={CalendarClock}>Forecast · still to renew</SectionLabel>
            <Card padding="none">
              {remaining.map((r, i) => {
                const running = committedMinor + remaining.slice(0, i + 1).reduce((sum, x) => sum + x.amountMinor, 0);
                return (
                  <ListRow
                    key={`${r.id}-${i}`}
                    divider={i < remaining.length - 1}
                    leading={<ServiceAvatar name={r.name} size={36} />}
                    title={r.name}
                    subtitle={`${formatShortDate(r.date)}${r.note ? ` · ${r.note}` : ""}`}
                    trailing={
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 14, color: c.textPrimary }}>+{money(r.amountMinor)}</Text>
                        <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 11, color: c.textTertiary }}>→ {money(running)}</Text>
                      </View>
                    }
                  />
                );
              })}
            </Card>
          </>
        ) : null}

        {/* Income context (free, optional) */}
        <SectionLabel t={t} Icon={Banknote}>Income context</SectionLabel>
        {config.incomeMinor == null ? (
          <Card padding="md">
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 13.5, color: c.textSecondary, marginBottom: 10, lineHeight: 19 }}>
              Optional — add monthly income to see what % goes to subscriptions. Budgeting works fine without it.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Input prefix={currencySymbol(homeCurrency)} mono placeholder="4200" keyboardType="number-pad" value={incomeInput} onChangeText={(text) => setIncomeInput(text.replace(/[^0-9]/g, ""))} />
              </View>
              <Button variant="secondary" size="lg" onPress={() => { const n = Number(incomeInput); if (n > 0) setIncome(Math.round(n * 100)); }}>Add</Button>
            </View>
          </Card>
        ) : (
          <Card padding="md">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 22, color: c.textPrimary }}>{Math.round((projectedMinor / config.incomeMinor) * 100)}%</Text>
                <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12.5, color: c.textTertiary }}>of {dollarsRound(config.incomeMinor)} income goes to subscriptions</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 16, color: c.textPrimary }}>{money(config.incomeMinor - projectedMinor)}</Text>
                <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12, color: c.textTertiary }}>left after recurring</Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setIncome(null)} style={{ marginTop: 4 }}>
                  <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 12, color: c.accentText }}>Edit</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        )}

        {/* Category budgets (Pro) */}
        <SectionLabel t={t} Icon={PieChart} pro={!isPro}>Category budgets</SectionLabel>
        {!isPro ? (
          <LockedCard t={t} onPress={() => router.push("/paywall")} body="Cap each category and see committed vs target." />
        ) : (
          <Card padding="md">
            <View style={{ rowGap: 14 }}>
              {categoryRows.length === 0 ? (
                <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 13, color: c.textTertiary }}>No category spend forecast this month.</Text>
              ) : categoryRows.map((row) => {
                const over = row.projected > row.cap;
                const barPct = Math.min(100, (row.projected / row.cap) * 100);
                const dot = (t.palette.category as Record<string, string>)[row.category] ?? c.accent;
                return (
                  <View key={row.category}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} />
                        <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 14, color: c.textPrimary }}>{categoryLabel(row.category)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 13, color: over ? c.danger : c.textTertiary }}>
                          <Text style={{ fontFamily: t.fonts.mono.bold, color: c.textPrimary }}>{money(row.projected)}</Text> / {dollarsRound(row.cap)}
                        </Text>
                        <IconButton variant="secondary" size={26} label="Lower cap" onPress={() => setCategoryCap(row.category, Math.max(500, row.cap - 500))}><Minus size={13} color={c.textPrimary} strokeWidth={2} /></IconButton>
                        <IconButton variant="secondary" size={26} label="Raise cap" onPress={() => setCategoryCap(row.category, row.cap + 500)}><Plus size={13} color={c.textPrimary} strokeWidth={2} /></IconButton>
                      </View>
                    </View>
                    <View style={{ height: 7, backgroundColor: c.surfaceSunken, borderRadius: 4, overflow: "hidden" }}>
                      <View style={{ width: `${barPct}%`, height: "100%", backgroundColor: over ? c.danger : dot, borderRadius: 4 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Manual envelopes (Pro) */}
        <SectionLabel t={t} Icon={Wallet} pro={!isPro}>Manual envelopes</SectionLabel>
        {!isPro ? (
          <LockedCard t={t} onPress={() => router.push("/paywall")} body="Fund-and-spend envelopes — no import needed." />
        ) : (
          <Card padding="none">
            {config.envelopes.length > 0 ? (
              <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12, color: c.textTertiary, paddingHorizontal: 14, paddingTop: 12 }}>
                Envelopes track total funded vs. spent — they don't reset automatically. Remove one to start it fresh.
              </Text>
            ) : null}
            {config.envelopes.map((e, i) => {
              const over = e.spentMinor > e.fundedMinor;
              const barPct = Math.min(100, e.fundedMinor > 0 ? (e.spentMinor / e.fundedMinor) * 100 : 0);
              const confirmRemove = () => Alert.alert(
                "Remove envelope",
                `Remove "${e.name}"? This can't be undone.`,
                [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => removeEnvelope(e.id) }]
              );
              return (
                <View key={e.id} style={{ paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.borderSubtle }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <View style={{ width: 34, height: 34, borderRadius: t.radius.md, backgroundColor: c.surfaceSunken, alignItems: "center", justifyContent: "center" }}>
                      <Wallet size={17} color={c.textSecondary} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 14, color: c.textPrimary }}>{e.name}</Text>
                      <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 12, color: over ? c.danger : c.textTertiary }}>{money(e.spentMinor)} of {money(e.fundedMinor)}{over ? " · over" : ""}</Text>
                    </View>
                    <Button variant="ghost" size="sm" onPress={() => logEnvelope(e.id, 500)} leftIcon={<Plus size={15} color={c.textPrimary} strokeWidth={2} />}>Log {currencySymbol(homeCurrency)}5</Button>
                    <IconButton variant="ghost" size={32} label={`Remove ${e.name}`} onPress={confirmRemove}>
                      <Trash2 size={16} color={c.textTertiary} strokeWidth={2} />
                    </IconButton>
                  </View>
                  <View style={{ height: 6, backgroundColor: c.surfaceSunken, borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
                    <View style={{ width: `${barPct}%`, height: "100%", backgroundColor: over ? c.danger : c.accent, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add envelope"
              onPress={() => addEnvelope("New envelope", 10000)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderTopWidth: config.envelopes.length ? 1 : 0, borderTopColor: c.borderSubtle }}
            >
              <Plus size={16} color={c.accentText} strokeWidth={2} />
              <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 13.5, color: c.accentText }}>Add envelope</Text>
            </Pressable>
          </Card>
        )}

        {/* Recap entry */}
        <Pressable accessibilityRole="button" onPress={() => router.push("/budget-recap" as never)} style={[{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.borderSubtle, borderRadius: t.radius.lg, paddingHorizontal: 16, paddingVertical: 14 }, t.shadow.xs]}>
          <History size={20} color={c.textSecondary} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 14, color: c.textPrimary }}>Last month&apos;s recap</Text>
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12.5, color: c.textTertiary }}>How your spend tracked against your cap.</Text>
          </View>
          <ChevronRight size={18} color={c.textTertiary} strokeWidth={2} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ t, Icon, children, pro }: { t: ReturnType<typeof useZenoTokens>; Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; children: string; pro?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, paddingTop: 22, paddingBottom: 10 }}>
      <Icon size={17} color={t.color.textSecondary} strokeWidth={2} />
      <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 16, color: t.color.textPrimary }}>{children}</Text>
      {pro ? <Badge tone="accent">Pro</Badge> : null}
    </View>
  );
}

function LockedCard({ t, onPress, body }: { t: ReturnType<typeof useZenoTokens>; onPress: () => void; body: string }) {
  const c = t.color;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surfaceCard, borderWidth: 1, borderColor: c.borderSubtle, borderRadius: t.radius.lg, paddingHorizontal: 16, paddingVertical: 14 }, t.shadow.xs]}>
      <View style={{ width: 36, height: 36, borderRadius: t.radius.md, backgroundColor: c.surfaceSunken, alignItems: "center", justifyContent: "center" }}>
        <Lock size={17} color={c.textSecondary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: 14, color: c.textPrimary }}>Unlock with Pro</Text>
        <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 12.5, color: c.textTertiary }}>{body}</Text>
      </View>
      <ChevronRight size={18} color={c.textTertiary} strokeWidth={2} />
    </Pressable>
  );
}
