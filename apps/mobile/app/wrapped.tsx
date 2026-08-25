import { Share2 } from "lucide-react-native";
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { Button, LedgerLine } from "../src/components/zeno";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";
import { formatMoney } from "../src/utils/format";
import { shareText } from "../src/utils/share";
import { recordFunnelEvent } from "../src/api/client";

// Small per-stat share affordance — each Wrapped stat is its own share
// moment (3.2), not just the combined "Share my Wrapped" summary below.
function ShareIconButton({ label, onPress, theme }: { label: string; onPress: () => void; theme: ThemeTokens }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" }}
    >
      <Share2 size={15} color={theme.mutedText} strokeWidth={2} />
    </Pressable>
  );
}

function labelCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A block of the Wrapped page: paper, hairline rule frame, no resting shadow. */
function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useZenoTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.rule, borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 12 }, style]}>
      {children}
    </View>
  );
}

export default function WrappedScreen() {
  const { theme } = useZenoTheme();
  const { yearInReview: review, homeCurrency } = useSubscriptionStore();
  const money = (minor: number) => formatMoney(minor, homeCurrency);

  // Truthful period phrasing: the total only covers spend since the user began
  // tracking each sub, so a new user must not see "over the last 12 months".
  const coveragePhrase = review.coversFullTrailingYear || !review.coverageStartLabel
    ? "over the last 12 months"
    : `since I started tracking in ${review.coverageStartLabel}`;

  const shareSummary = async () => {
    const lines = [
      "My subscriptions, wrapped:",
      `· ${money(review.totalSpentMinor)} spent ${coveragePhrase}`,
      review.mostExpensive ? `· Priciest: ${review.mostExpensive.name} (${money(review.mostExpensive.monthlyMinor)}/mo)` : null,
      review.topCategory ? `· Most spent on: ${labelCategory(review.topCategory.category)}` : null,
      review.cancelledCount > 0 ? `· Cancelled ${review.cancelledCount} I didn't need` : null,
      review.excludedCurrencyCount ? `· ${review.excludedCurrencyCount} subscription(s) in other currencies not included` : null
    ].filter(Boolean).join("\n");
    recordFunnelEvent("share_card_generated", "wrapped_summary");
    await shareText(lines);
  };

  // Per-stat share cards (3.2): one designed card per stat, not just the
  // combined summary above — each is its own share moment.
  const shareTotal = () => {
    recordFunnelEvent("share_card_generated", "wrapped_total");
    return shareText(
      `I spent ${money(review.totalSpentMinor)} on subscriptions ${coveragePhrase} — and I'm on pace for ${money(review.projectedAnnualMinor)} next year.`
    );
  };
  const shareMostExpensive = () => {
    if (!review.mostExpensive) return undefined;
    recordFunnelEvent("share_card_generated", "wrapped_most_expensive");
    return shareText(`My priciest subscription right now: ${review.mostExpensive.name} at ${money(review.mostExpensive.monthlyMinor)}/month.`);
  };
  const shareTopCategory = () => {
    if (!review.topCategory) return undefined;
    recordFunnelEvent("share_card_generated", "wrapped_top_category");
    return shareText(`${labelCategory(review.topCategory.category)} is where most of my subscription money goes — ${money(review.topCategory.monthlyMinor)}/month.`);
  };
  const shareBusiestMonth = () => {
    if (!review.busiestMonth) return undefined;
    recordFunnelEvent("share_card_generated", "wrapped_busiest_month");
    return shareText(`${review.busiestMonth.label} was my most expensive month for subscriptions: ${money(review.busiestMonth.amountMinor)}.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.mutedText, fontFamily: theme.numberFontFamily, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
              Your year in subscriptions
            </Text>
            <Text style={{ color: theme.text, fontSize: 34, lineHeight: 40, fontWeight: "900", marginTop: 6 }}>
              You spent {money(review.totalSpentMinor)}
            </Text>
            <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 15 }}>
              {review.coversFullTrailingYear || !review.coverageStartLabel
                ? "on subscriptions over the last 12 months."
                : `on subscriptions since you started tracking in ${review.coverageStartLabel}.`}
            </Text>
          </View>
          <ShareIconButton label="Share total spend" onPress={shareTotal} theme={theme} />
        </View>

        {/* The year's arithmetic as ledger lines, not KPI tiles. */}
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.ruleStrong, marginHorizontal: 20, marginTop: 4 }}>
          <LedgerLine label="Active now" value={`${review.activeCount}`} />
          <LedgerLine label="Cancelled" value={`${review.cancelledCount}`} valueColor={theme.stampVerified} />
          <LedgerLine label="On pace next year" value={money(review.projectedAnnualMinor)} strong />
        </View>

        {review.mostExpensive ? (
          <Surface>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>Your priciest subscription</Text>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{review.mostExpensive.name}</Text>
                <Text style={{ color: theme.mutedText, marginTop: 2 }}>{money(review.mostExpensive.monthlyMinor)} / month</Text>
              </View>
              <ShareIconButton label="Share priciest subscription" onPress={shareMostExpensive} theme={theme} />
            </View>
          </Surface>
        ) : null}

        {review.topCategory ? (
          <Surface>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>Where most of it went</Text>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{labelCategory(review.topCategory.category)}</Text>
                <Text style={{ color: theme.mutedText, marginTop: 2 }}>{money(review.topCategory.monthlyMinor)} / month</Text>
              </View>
              <ShareIconButton label="Share top category" onPress={shareTopCategory} theme={theme} />
            </View>
          </Surface>
        ) : null}

        {review.busiestMonth && review.busiestMonth.amountMinor > 0 ? (
          <Surface>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>Your most expensive month</Text>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{review.busiestMonth.label}</Text>
                <Text style={{ color: theme.mutedText, marginTop: 2 }}>{money(review.busiestMonth.amountMinor)} charged</Text>
              </View>
              <ShareIconButton label="Share busiest month" onPress={shareBusiestMonth} theme={theme} />
            </View>
          </Surface>
        ) : null}

        {review.excludedCurrencyCount ? (
          <Text style={{ color: theme.mutedText, fontSize: 12, textAlign: "center" }}>
            {review.excludedCurrencyCount} subscription{review.excludedCurrencyCount > 1 ? "s" : ""} in other currencies aren&apos;t included above.
          </Text>
        ) : null}

        <Button variant="primary" size="lg" fullWidth onPress={shareSummary} style={{ marginHorizontal: 20 }}>Share my Wrapped</Button>
      </ScrollView>
    </View>
  );
}
