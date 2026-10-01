import { ScrollView, Text, View } from "react-native";
import { Screen, Surface } from "./ui";
import { useZenoTheme } from "../theme/theme-provider";

/**
 * Honest preview state for features that are on the roadmap but not yet built.
 * Replaces demo screens that rendered fake data as if it were real — shows what's
 * coming, without pretending it works.
 *
 * F153: it had a "Notify me when it's ready" button that answered "You're on
 * the list ✓ We'll let you know the moment this ships". Nothing was recorded
 * anywhere, so there was no list and nobody would be told. It is gone.
 */
export function ComingSoon({ title, tagline, points }: { title: string; tagline: string; points: string[] }) {
  const { theme } = useZenoTheme();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>{title}</Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: theme.primarySurface, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.primary, fontWeight: "800", fontSize: 11, letterSpacing: 0.6 }}>COMING SOON</Text>
          </View>
        </View>

        <Text style={{ color: theme.mutedText, fontSize: 16, lineHeight: 22 }}>{tagline}</Text>

        <Surface>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800", marginBottom: 12 }}>What you&rsquo;ll get</Text>
          <View style={{ gap: 11 }}>
            {points.map((point) => (
              <View key={point} style={{ flexDirection: "row", gap: 10 }}>
                <Text style={{ color: theme.primary, fontWeight: "900" }}>•</Text>
                <Text style={{ color: theme.mutedText, flex: 1, lineHeight: 21 }}>{point}</Text>
              </View>
            ))}
          </View>
        </Surface>
      </ScrollView>
    </Screen>
  );
}
