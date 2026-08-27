import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Button } from "../src/components/zeno";
import { getMobileBackendStatus, type MobileBackendStatus } from "../src/api/client";
import { useZenoTheme } from "../src/theme/theme-provider";

/** Ledger paper block — local so this dev screen is off the legacy ui kit. */
function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useZenoTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.rule, borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 12 }, style]}>
      {children}
    </View>
  );
}

export default function BackendScreen() {
  const { theme } = useZenoTheme();
  const [status, setStatus] = useState<MobileBackendStatus | null>(null);

  const refresh = () => {
    void getMobileBackendStatus().then(setStatus);
  };

  useEffect(refresh, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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

        <Button variant="primary" size="lg" fullWidth onPress={refresh} style={{ marginHorizontal: 20, marginTop: 10 }}>Refresh connection</Button>
      </ScrollView>
    </View>
  );
}
