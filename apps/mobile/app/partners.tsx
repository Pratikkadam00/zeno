import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTheme } from "../src/theme/theme-provider";

export default function PartnersScreen() {
  const { theme } = useZenoTheme();
  const { partnerIntegrations } = useSubscriptionStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Partners</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            Partner manifests for finance apps, spreadsheets, chat, and automation.
          </Text>
        </View>

        {partnerIntegrations.map((integration) => (
          <Surface key={integration.id}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>{integration.name}</Text>
            <Text style={{ color: theme.mutedText, marginTop: 8 }}>
              {integration.category.replace("_", " ")} · {integration.status.replace("_", " ")}
            </Text>
            <Text style={{ color: integration.exportsFinancialData ? theme.warning : theme.secondary, marginTop: 8, fontWeight: "800" }}>
              {integration.exportsFinancialData ? "Exports financial data with consent" : "No financial export"}
            </Text>
          </Surface>
        ))}
      </ScrollView>
    </Screen>
  );
}
