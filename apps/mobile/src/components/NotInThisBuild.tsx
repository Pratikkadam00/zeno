import { router } from "expo-router";
import { Text, View } from "react-native";
import { useZenoTheme } from "../theme/theme-provider";
import { Button } from "./zeno";

/**
 * F151: what a release build shows for a developer screen (open-banking,
 * backend). Every file in app/ is a route, so a deep link reached them in
 * release builds too: "Connect a sandbox bank" called the server's Plaid
 * sandbox, and "Backend" listed the API's address and capabilities.
 */
export function NotInThisBuild() {
  const { theme } = useZenoTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16, backgroundColor: theme.background }}>
      <Text style={{ color: theme.mutedText, fontSize: 15, textAlign: "center" }}>This screen isn&apos;t part of this version of Zeno.</Text>
      <Button variant="secondary" size="lg" onPress={() => router.back()}>Go back</Button>
    </View>
  );
}
