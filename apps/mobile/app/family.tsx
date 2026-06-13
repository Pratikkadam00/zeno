import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { formatMoney } from "../src/utils/format";
import { useSubRadarTheme } from "../src/theme/theme-provider";

export default function FamilyVaultScreen() {
  const { theme } = useSubRadarTheme();
  const { familyVault } = useSubscriptionStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Family Vault</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            Combined monthly spend: {formatMoney(familyVault.totalMonthlySpend.amountMinor, familyVault.totalMonthlySpend.currency)}
          </Text>
        </View>

        {familyVault.members.map((member) => (
          <Surface key={member.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: member.color }} />
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>{member.name}</Text>
            </View>
            <Text style={{ color: theme.mutedText, marginTop: 8 }}>
              {member.subscriptionCount} active · {formatMoney(member.monthlySpend.amountMinor, member.monthlySpend.currency)}/mo
            </Text>
          </Surface>
        ))}

        <Surface>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Shared subscriptions</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {familyVault.sharedSubscriptions.map((subscription) => (
              <Text key={subscription.id} style={{ color: theme.mutedText }}>{subscription.name}</Text>
            ))}
          </View>
        </Surface>
      </ScrollView>
    </Screen>
  );
}
