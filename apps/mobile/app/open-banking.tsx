import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PrimaryButton, Screen, Surface } from "../src/components/ui";
import { connectPlaidSandbox, createPlaidLinkToken } from "../src/api/client";
import { useZenoTheme } from "../src/theme/theme-provider";

type Status = { kind: "idle" | "working" | "ok" | "error"; message: string };

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
    <Screen>
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
          <PrimaryButton onPress={checkServer}>Check connection</PrimaryButton>
          <PrimaryButton onPress={simulate}>Connect a sandbox bank</PrimaryButton>
        </View>

        <Surface>
          <Text style={{ color: theme.mutedText, fontSize: 13, lineHeight: 20 }}>
            In production, &quot;Connect&quot; opens Plaid&rsquo;s secure Link screen (native module) where you choose your bank and approve read-only access. That requires a native build. The sandbox button above exercises the full connect → exchange → transactions flow against Plaid&rsquo;s test environment.
          </Text>
        </Surface>
      </ScrollView>
    </Screen>
  );
}
