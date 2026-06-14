import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PrimaryButton, Screen, Surface } from "../src/components/ui";
import { createOpenBankingIntentViaApi } from "../src/api/client";
import { useZenoTheme } from "../src/theme/theme-provider";

export default function OpenBankingScreen() {
  const { theme } = useZenoTheme();
  const [message, setMessage] = useState("No connection intent created yet.");

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Open Banking</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            Optional premium read-only OAuth. SubRadar never sees bank login credentials.
          </Text>
        </View>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Dev adapter</Text>
          <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>{message}</Text>
        </Surface>

        <View style={{ gap: 12 }}>
          <PrimaryButton
            onPress={() => {
              void createOpenBankingIntentViaApi("plaid")
                .then((intent) => setMessage(`Plaid API intent created: ${intent.intentId}. Scope: ${intent.scopes.join(", ")}.`))
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Plaid API intent failed."));
            }}
          >
            Create Plaid intent
          </PrimaryButton>
          <PrimaryButton
            onPress={() => {
              void createOpenBankingIntentViaApi("mx")
                .then((intent) => setMessage(`MX API intent created: ${intent.intentId}. Scope: ${intent.scopes.join(", ")}.`))
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "MX API intent failed."));
            }}
          >
            Create MX intent
          </PrimaryButton>
        </View>
      </ScrollView>
    </Screen>
  );
}
