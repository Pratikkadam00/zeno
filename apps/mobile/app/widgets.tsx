import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTheme } from "../src/theme/theme-provider";
import { formatDaysLabel } from "../src/utils/subscription-ui";

export default function WidgetsScreen() {
  const { theme } = useZenoTheme();
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

        <Surface style={{ backgroundColor: theme.warningSurface }}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>Preview only, for now</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, lineHeight: 20 }}>
            This shows the data a home-screen widget or watch complication would
            display. Actually adding a Zeno widget to your home screen or watch
            face isn&apos;t available yet — we&apos;ll let you know when it ships.
          </Text>
        </Surface>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Next renewal</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>
            {widgetSnapshot.nextRenewal
              ? `${widgetSnapshot.nextRenewal.name} · ${widgetSnapshot.nextRenewal.amountLabel} · ${formatDaysLabel(widgetSnapshot.nextRenewal.daysUntil)}`
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
