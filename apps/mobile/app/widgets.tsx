import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useSubRadarTheme } from "../src/theme/theme-provider";

export default function WidgetsScreen() {
  const { theme } = useSubRadarTheme();
  const { widgetSnapshot } = useSubscriptionStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Widgets + Watch</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            A compact local snapshot for Android widgets, iOS widgets, and Apple Watch complications.
          </Text>
        </View>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Next renewal</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>
            {widgetSnapshot.nextRenewal
              ? `${widgetSnapshot.nextRenewal.name} · ${widgetSnapshot.nextRenewal.amountLabel} · ${widgetSnapshot.nextRenewal.daysUntil} days`
              : "No upcoming renewals"}
          </Text>
        </Surface>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Complication text</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8 }}>{widgetSnapshot.watchComplicationText}</Text>
        </Surface>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Monthly glance</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8 }}>
            {widgetSnapshot.monthlySpendLabel} · {widgetSnapshot.activeCount} active subscriptions
          </Text>
        </Surface>
      </ScrollView>
    </Screen>
  );
}
