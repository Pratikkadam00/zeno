import { useState, type ReactNode } from "react";
import { ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Button } from "../src/components/zeno";
import { connectPlaidSandbox, createPlaidLinkToken } from "../src/api/client";
import { useZenoTheme } from "../src/theme/theme-provider";

type Status = { kind: "idle" | "working" | "ok" | "error"; message: string };

/** Ledger paper block — local so this dev screen is off the legacy ui kit. */
function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useZenoTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.rule, borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 12 }, style]}>
      {children}
    </View>
  );
}

export default function OpenBankingScreen() {
  const { theme } = useZenoTheme();
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "Not connected." });

  const checkServer = () => {
    setStatus({ kind: "working", message: "Requesting a secure link token…" });
    void createPlaidLinkToken()
      .then((token) => setStatus({ kind: "ok", message: `Server is configured. Link token ready (expires ${new Date(token.expiration).toLocaleTimeString()}).` }))
      .catch((error: unknown) => setStatus({ kind: "error", message: error instanceof Error ? error.message : "Bank connect is not configured on the server." }));
  };

  const simulate = () => {
    setStatus({ kind: "working", message: "Connecting a sandbox bank…" });
    void connectPlaidSandbox()
      .then((result) => setStatus({ kind: "ok", message: `Sandbox bank connected. Pulled ${result.transactionCount} transactions (sandbox populates more after Plaid's initial sync).` }))
      .catch((error: unknown) => setStatus({ kind: "error", message: error instanceof Error ? error.message : "Sandbox connection failed." }));
  };

  const statusColor = status.kind === "ok" ? theme.success : status.kind === "error" ? theme.danger : theme.mutedText;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Connect your bank</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16, lineHeight: 22 }}>
            Optional. A read-only connection that auto-discovers recurring charges. Zeno never sees your bank login — Plaid handles it, and we only receive transactions.
          </Text>
        </View>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Status</Text>
          <Text style={{ color: statusColor, marginTop: 8, lineHeight: 21 }}>{status.message}</Text>
        </Surface>

        <View style={{ gap: 12 }}>
          <Button variant="primary" size="lg" fullWidth onPress={checkServer} style={{ marginHorizontal: 20, marginTop: 10 }}>Check connection</Button>
          <Button variant="primary" size="lg" fullWidth onPress={simulate} style={{ marginHorizontal: 20, marginTop: 10 }}>Connect a sandbox bank</Button>
        </View>

        <Surface>
          <Text style={{ color: theme.mutedText, fontSize: 13, lineHeight: 20 }}>
            In production, &quot;Connect&quot; opens Plaid&rsquo;s secure Link screen (native module) where you choose your bank and approve read-only access. That requires a native build. The sandbox button above exercises the full connect → exchange → transactions flow against Plaid&rsquo;s test environment.
          </Text>
        </Surface>
      </ScrollView>
    </View>
  );
}
