import { createPublicApiKeyPreview, type PublicApiKey } from "@subradar/shared";
import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "../src/components/ui";
import { useSubRadarTheme } from "../src/theme/theme-provider";

const demoKey: PublicApiKey = {
  id: "key_mobile_demo",
  label: "Personal dashboard export",
  prefix: "sr_dev",
  scopes: ["subscriptions:read", "analytics:read"],
  createdAt: "2026-05-24T00:00:00.000Z"
};

export default function PublicApiScreen() {
  const { theme } = useSubRadarTheme();
  const preview = createPublicApiKeyPreview(demoKey);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Public API</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            Scoped API key model for power users. Full key material is never shown after creation.
          </Text>
        </View>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>{preview.label}</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8 }}>{preview.maskedKey}</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8 }}>Scopes: {preview.scopes.join(", ")}</Text>
        </Surface>
      </ScrollView>
    </Screen>
  );
}
