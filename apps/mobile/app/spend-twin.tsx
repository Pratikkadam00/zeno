import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { formatMoney } from "../src/utils/format";
import { useSubRadarTheme } from "../src/theme/theme-provider";

export default function SpendTwinScreen() {
  const { theme } = useSubRadarTheme();
  const { totalMonthlyMinor, spendTwin } = useSubscriptionStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Spend Twin</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            {formatMoney(totalMonthlyMinor)} per month translated into real-world tradeoffs.
          </Text>
        </View>

        {spendTwin.map((comparison) => (
          <Surface key={comparison.label}>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: "900" }}>{comparison.quantity}</Text>
            <Text style={{ color: theme.text, marginTop: 4, fontSize: 18, fontWeight: "800" }}>{comparison.label}</Text>
            <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>{comparison.description}</Text>
          </Surface>
        ))}
      </ScrollView>
    </Screen>
  );
}
