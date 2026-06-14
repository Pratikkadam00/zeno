import { ScrollView, Text, View } from "react-native";
import { Kpi, Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { formatMoney } from "../src/utils/format";
import { useZenoTheme } from "../src/theme/theme-provider";

export default function BusinessScreen() {
  const { theme } = useZenoTheme();
  const { businessSummary } = useSubscriptionStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Business Tier</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>{businessSummary.workspaceName}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Kpi label="Seats" value={`${businessSummary.seatCount}`} />
          <Kpi label="Renewals 30d" value={`${businessSummary.renewalCountNext30Days}`} />
        </View>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Team subscription spend</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8 }}>
            {formatMoney(businessSummary.monthlySpend.amountMinor, businessSummary.monthlySpend.currency)} per month across {businessSummary.subscriptionCount} active subscriptions.
          </Text>
        </Surface>
      </ScrollView>
    </Screen>
  );
}
