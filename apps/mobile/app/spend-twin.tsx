import { ScrollView, Text, View } from "react-native";
import { LedgerLine, SectionHead } from "../src/components/zeno";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { fonts } from "../src/theme/zeno";
import { formatMoney } from "../src/utils/format";
import { useZenoTheme } from "../src/theme/theme-provider";

export default function SpendTwinScreen() {
  const { theme } = useZenoTheme();
  const { totalMonthlyMinor, spendTwin, homeCurrency } = useSubscriptionStore();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontFamily: fonts.mono.bold, fontSize: 10.5, letterSpacing: 1.8, color: theme.quietText }}>THE SAME MONEY, AS</Text>
          <Text style={{ fontFamily: fonts.display.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, color: theme.text, marginTop: 6 }}>Spend Twin</Text>
          <Text style={{ fontFamily: fonts.sans.regular, fontSize: 15, color: theme.mutedText, marginTop: 6, lineHeight: 22 }}>
            {formatMoney(totalMonthlyMinor, homeCurrency)} per month, converted into everyday things.
          </Text>
        </View>

        {spendTwin.length > 0 ? (
          <>
            <SectionHead>Equivalents</SectionHead>
            <View style={{ paddingHorizontal: 20 }}>
              {spendTwin.map((comparison) => (
                <View key={comparison.label} style={{ borderBottomWidth: 1, borderColor: theme.rule, paddingBottom: 8 }}>
                  <LedgerLine label={comparison.label} value={String(comparison.quantity)} strong size={15} />
                  <Text style={{ fontFamily: fonts.sans.regular, fontSize: 12.5, color: theme.quietText, lineHeight: 18, paddingBottom: 4 }}>
                    {comparison.description}
                  </Text>
                </View>
              ))}
            </View>

            {/* Honesty: these are FIXED illustrative reference prices held in the
                app, not live prices, not local prices, and not derived from your
                data. Saying so keeps a rough gut-check from reading as a
                personalised measurement. */}
            <Text
              style={{
                fontFamily: fonts.sans.regular,
                fontSize: 12,
                color: theme.quietText,
                lineHeight: 18,
                marginHorizontal: 20,
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderColor: theme.rule
              }}
            >
              Comparisons use fixed reference prices built into the app — not live or local prices, and nothing about your
              purchases. They are a rough sense of scale, not a measurement.
            </Text>
          </>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <Text style={{ fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 1.8, color: theme.quietText, marginBottom: 8 }}>NOTHING TO COMPARE</Text>
            <Text style={{ fontFamily: fonts.sans.regular, fontSize: 14, color: theme.mutedText, lineHeight: 20 }}>
              Track a subscription and this page fills in.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
