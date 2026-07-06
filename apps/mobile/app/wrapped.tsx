import { Share2 } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Kpi, PrimaryButton, Screen, Surface } from "../src/components/ui";
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

export default function WrappedScreen() {
  const { theme } = useZenoTheme();
  const { yearInReview: review, homeCurrency } = useSubscriptionStore();
  const money = (minor: number) => formatMoney(minor, homeCurrency);

  const shareSummary = async () => {
    const lines = [
      "My subscriptions this year:",
      `· ${money(review.totalSpentMinor)} spent over 12 months`,
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
      `I spent ${money(review.totalSpentMinor)} on subscriptions this year — and I'm on pace for ${money(review.projectedAnnualMinor)} next year.`
    );
  };
  const shareMostExpensive = () => {
    if (!review.mostExpensive) return undefined;
    recordFunnelEvent("share_card_generated", "wrapped_most_expensive");
    return shareText(`My priciest subscription this year: ${review.mostExpensive.name} at ${money(review.mostExpensive.monthlyMinor)}/month.`);
  };
  const shareTopCategory = () => {
    if (!review.topCategory) return undefined;
    recordFunnelEvent("share_card_generated", "wrapped_top_category");
    return shareText(`${labelCategory(review.topCategory.category)} was where most of my subscription money went this year — ${money(review.topCategory.monthlyMinor)}/month.`);
  };
  const shareBusiestMonth = () => {
    if (!review.busiestMonth) return undefined;
    recordFunnelEvent("share_card_generated", "wrapped_busiest_month");
    return shareText(`${review.busiestMonth.label} was my most expensive month for subscriptions: ${money(review.busiestMonth.amountMinor)}.`);
  };

  return (
    <Screen>
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
              on subscriptions over the last 12 months.
            </Text>
          </View>
          <ShareIconButton label="Share total spend" onPress={shareTotal} theme={theme} />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Kpi label="Active now" value={`${review.activeCount}`} />
          <Kpi label="Cancelled" value={`${review.cancelledCount}`} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Kpi label="On pace next year" value={money(review.projectedAnnualMinor)} />
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
            {review.excludedCurrencyCount} subscription{review.excludedCurrencyCount > 1 ? "s" : ""} in other currencies aren't included above.
          </Text>
        ) : null}

        <PrimaryButton onPress={shareSummary}>Share my Wrapped</PrimaryButton>
      </ScrollView>
    </Screen>
  );
}
