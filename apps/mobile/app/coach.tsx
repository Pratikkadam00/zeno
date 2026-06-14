import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "../src/components/ui";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { formatMoney } from "../src/utils/format";
import { useZenoTheme } from "../src/theme/theme-provider";

export default function CoachScreen() {
  const { theme } = useZenoTheme();
  const { spendSummary } = useSubscriptionStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>AI spend coach</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16 }}>
            Local deterministic insights first. Provider-backed coaching plugs in later.
          </Text>
        </View>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>{formatMoney(spendSummary.totalMonthlyMinor)}</Text>
          <Text style={{ color: theme.mutedText, marginTop: 4 }}>Estimated monthly subscription spend</Text>
        </Surface>

        {spendSummary?.byCategory?.length ? (
          <>
            <Surface>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Category breakdown</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                {spendSummary.byCategory.map((row) => (
                  <View key={row.category} style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }}>
                    <Text style={{ color: theme.text, fontWeight: "800" }}>{row.category.replace("_", " ")}</Text>
                    <Text style={{ color: theme.mutedText, marginTop: 4 }}>{formatMoney(row.monthlyMinor)} · {row.count} active</Text>
                  </View>
                ))}
              </View>
            </Surface>

            <View style={{ gap: 12 }}>
              {spendSummary.insights.map((insight) => (
                <Surface key={`${insight.kind}-${insight.title}`}>
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: "900" }}>{insight.title}</Text>
                  <Text style={{ color: theme.mutedText, marginTop: 8, lineHeight: 21 }}>{insight.body}</Text>
                  {insight.estimatedMonthlyImpactMinor ? (
                    <Text style={{ color: theme.secondary, marginTop: 8, fontWeight: "800" }}>
                      Potential impact: {formatMoney(insight.estimatedMonthlyImpactMinor)}/mo
                    </Text>
                  ) : null}
                </Surface>
              ))}
            </View>
          </>
        ) : (
          <Surface>
            <Text style={{ color: theme.mutedText, fontSize: 16 }}>No spending insights yet</Text>
          </Surface>
        )}
      </ScrollView>
    </Screen>
  );
}
