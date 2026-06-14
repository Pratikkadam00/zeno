import { buildYearInReview } from "@subradar/shared";
import { useMemo } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import { Kpi, PrimaryButton, Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTheme } from "../src/theme/theme-provider";
import { formatMoney } from "../src/utils/format";

function labelCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WrappedScreen() {
  const { theme } = useZenoTheme();
  const { subscriptions } = useSubscriptionStore();
  const review = useMemo(() => buildYearInReview(subscriptions), [subscriptions]);

  const shareSummary = async () => {
    const lines = [
      "My subscriptions this year, via Zeno:",
      `· ${formatMoney(review.totalSpentMinor)} spent over 12 months`,
      review.mostExpensive ? `· Priciest: ${review.mostExpensive.name} (${formatMoney(review.mostExpensive.monthlyMinor)}/mo)` : null,
      review.topCategory ? `· Most spent on: ${labelCategory(review.topCategory.category)}` : null,
      review.cancelledCount > 0 ? `· Cancelled ${review.cancelledCount} I didn't need` : null
    ].filter(Boolean).join("\n");
    try {
      await Share.share({ message: lines });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.mutedText, fontFamily: theme.numberFontFamily, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
            Your year in subscriptions
          </Text>
          <Text style={{ color: theme.text, fontSize: 34, lineHeight: 40, fontWeight: "900", marginTop: 6 }}>
            You spent {formatMoney(review.totalSpentMinor)}
          </Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 15 }}>
            on subscriptions over the last 12 months.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Kpi label="Active now" value={`${review.activeCount}`} />
          <Kpi label="Cancelled" value={`${review.cancelledCount}`} />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Kpi label="On pace next year" value={formatMoney(review.projectedAnnualMinor)} />
        </View>

        {review.mostExpensive ? (
          <Surface>
            <Text style={{ color: theme.mutedText, fontSize: 13 }}>Your priciest subscription</Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{review.mostExpensive.name}</Text>
            <Text style={{ color: theme.mutedText, marginTop: 2 }}>{formatMoney(review.mostExpensive.monthlyMinor)} / month</Text>
          </Surface>
        ) : null}

        {review.topCategory ? (
          <Surface>
            <Text style={{ color: theme.mutedText, fontSize: 13 }}>Where most of it went</Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{labelCategory(review.topCategory.category)}</Text>
            <Text style={{ color: theme.mutedText, marginTop: 2 }}>{formatMoney(review.topCategory.monthlyMinor)} / month</Text>
          </Surface>
        ) : null}

        {review.busiestMonth && review.busiestMonth.amountMinor > 0 ? (
          <Surface>
            <Text style={{ color: theme.mutedText, fontSize: 13 }}>Your most expensive month</Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{review.busiestMonth.label}</Text>
            <Text style={{ color: theme.mutedText, marginTop: 2 }}>{formatMoney(review.busiestMonth.amountMinor)} charged</Text>
          </Surface>
        ) : null}

        <PrimaryButton onPress={shareSummary}>Share my Wrapped</PrimaryButton>
      </ScrollView>
    </Screen>
  );
}
