import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Screen, Surface, PrimaryButton } from "./ui";
import { useZenoTheme } from "../theme/theme-provider";

/**
 * Honest preview state for features that are on the roadmap but not yet built.
 * Replaces demo screens that rendered fake data as if it were real — shows what's
 * coming and lets the user register interest, without pretending it works.
 */
export function ComingSoon({ title, tagline, points }: { title: string; tagline: string; points: string[] }) {
  const { theme } = useZenoTheme();
  const [notified, setNotified] = useState(false);

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

        {notified ? (
          <Surface>
            <Text style={{ color: theme.text, fontWeight: "800" }}>You&rsquo;re on the list ✓</Text>
            <Text style={{ color: theme.mutedText, marginTop: 4 }}>We&rsquo;ll let you know the moment this ships.</Text>
          </Surface>
        ) : (
          <PrimaryButton onPress={() => setNotified(true)}>Notify me when it&rsquo;s ready</PrimaryButton>
        )}
      </ScrollView>
    </Screen>
  );
}
