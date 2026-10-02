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
  const { mostExpensive, topCategory, busiestMonth } = review;
  const money = (minor: number) => formatMoney(minor, homeCurrency);

  // Truthful period phrasing: the total only covers spend since the user began
  // tracking each sub, so a new user must not see "over the last 12 months".
  // F147: it counts each subscription, a cancelled one too, up to the day it
  // was cancelled. It is still an estimate from renewals (no bank data), so it
  // is "committed", as the design calls it, never "spent".
  const coveragePhrase = review.coversFullTrailingYear || !review.coverageStartLabel
    ? "over the last 12 months"
    : `since I started tracking in ${review.coverageStartLabel}`;

  const shareSummary = async () => {
    const lines = [
      "My subscriptions, wrapped:",
      `· ${money(review.totalSpentMinor)} committed on my subscriptions ${coveragePhrase}`,
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
      `My subscriptions came to ${money(review.totalSpentMinor)} ${coveragePhrase} — and I'm on pace for ${money(review.projectedAnnualMinor)} next year.`
    );
  };
  // Each takes its stat from the card that shows it (a card, and its share
  // button, exist only when the stat does).
  const shareMostExpensive = (stat: NonNullable<typeof mostExpensive>) => {
    recordFunnelEvent("share_card_generated", "wrapped_most_expensive");
    return shareText(`My priciest subscription right now: ${stat.name} at ${money(stat.monthlyMinor)}/month.`);
  };
  const shareTopCategory = (stat: NonNullable<typeof topCategory>) => {
    recordFunnelEvent("share_card_generated", "wrapped_top_category");
    return shareText(`${labelCategory(stat.category)} is where most of my subscription money goes — ${money(stat.monthlyMinor)}/month.`);
  };
  const shareBusiestMonth = (stat: NonNullable<typeof busiestMonth>) => {
    recordFunnelEvent("share_card_generated", "wrapped_busiest_month");
    return shareText(`${stat.label} was my most expensive month for subscriptions: ${money(stat.amountMinor)}.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.mutedText, fontFamily: theme.numberFontFamily, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
              Your year in subscriptions
            </Text>
            <Text style={{ color: theme.text, fontSize: 34, lineHeight: 40, fontWeight: "900", marginTop: 6 }}>
              {money(review.totalSpentMinor)} committed
            </Text>
            <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 15 }}>
              {review.coversFullTrailingYear || !review.coverageStartLabel
                ? "on your subscriptions over the last 12 months, each cancelled one until you cancelled it."
                : `on your subscriptions since you started tracking in ${review.coverageStartLabel}, each cancelled one until you cancelled it.`}
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

        {mostExpensive ? (
          <Surface>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>Your priciest subscription</Text>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{mostExpensive.name}</Text>
                <Text style={{ color: theme.mutedText, marginTop: 2 }}>{money(mostExpensive.monthlyMinor)} / month</Text>
              </View>
              <ShareIconButton label="Share priciest subscription" onPress={() => shareMostExpensive(mostExpensive)} theme={theme} />
            </View>
          </Surface>
        ) : null}

        {topCategory ? (
          <Surface>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>Where most of it went</Text>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{labelCategory(topCategory.category)}</Text>
                <Text style={{ color: theme.mutedText, marginTop: 2 }}>{money(topCategory.monthlyMinor)} / month</Text>
              </View>
              <ShareIconButton label="Share top category" onPress={() => shareTopCategory(topCategory)} theme={theme} />
            </View>
          </Surface>
        ) : null}

        {busiestMonth && busiestMonth.amountMinor > 0 ? (
          <Surface>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>Your most expensive month</Text>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{busiestMonth.label}</Text>
                <Text style={{ color: theme.mutedText, marginTop: 2 }}>{money(busiestMonth.amountMinor)} due</Text>
              </View>
              <ShareIconButton label="Share busiest month" onPress={() => shareBusiestMonth(busiestMonth)} theme={theme} />
            </View>
          </Surface>
        ) : null}

        {review.excludedCurrencyCount ? (
          <Text style={{ color: theme.mutedText, fontSize: 12, textAlign: "center" }}>
            {review.excludedCurrencyCount} subscription{review.excludedCurrencyCount > 1 ? "s" : ""} in other currencies {review.excludedCurrencyCount > 1 ? "aren't" : "isn't"} included above.
          </Text>
        ) : null}

        <View style={{ paddingHorizontal: 20 }}>
          <Button variant="primary" size="lg" fullWidth onPress={shareSummary}>Share my Wrapped</Button>
        </View>
      </ScrollView>
    </View>
  );
}
