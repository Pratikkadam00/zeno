import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PrimaryButton, Screen, Surface } from "../src/components/ui";
import { getMobileBackendStatus, type MobileBackendStatus } from "../src/api/client";
import { useSubRadarTheme } from "../src/theme/theme-provider";

export default function BackendScreen() {
  const { theme } = useSubRadarTheme();
  const [status, setStatus] = useState<MobileBackendStatus | null>(null);

  const refresh = () => {
    void getMobileBackendStatus().then(setStatus);
  };

  useEffect(refresh, []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Backend</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            Live connection check for the Fastify API.
          </Text>
        </View>

        <Surface>
          <Text style={{ color: status?.connected ? theme.secondary : theme.warning, fontSize: 18, fontWeight: "900" }}>
            {status?.connected ? "Connected" : "Not connected"}
          </Text>
          <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>
            {status?.message ?? "Checking backend..."}
          </Text>
          <Text style={{ color: theme.mutedText, marginTop: 8 }}>{status?.apiBaseUrl}</Text>
        </Surface>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Capabilities</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {(status?.capabilities ?? []).slice(0, 8).map((capability) => (
              <Text key={capability} style={{ color: theme.mutedText }}>{capability.replaceAll("_", " ")}</Text>
            ))}
          </View>
        </Surface>

        <PrimaryButton onPress={refresh}>Refresh connection</PrimaryButton>
      </ScrollView>
    </Screen>
  );
}
