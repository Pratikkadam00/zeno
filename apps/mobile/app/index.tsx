import { router } from "expo-router";
import { BellRing, ShieldCheck, Smartphone } from "lucide-react-native";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { type } from "../src/theme/typography";
import { fonts } from "../src/theme/zeno";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const BEATS: { Icon: IconCmp; title: string; body: string }[] = [
  { Icon: ShieldCheck, title: "No bank login. Ever.", body: "Zeno never asks for your banking credentials — and never sees them." },
  { Icon: Smartphone, title: "Your data stays on your device", body: "We find subscriptions from email receipts and statements you control, processed on-device and encrypted." },
  { Icon: BellRing, title: "Warned before you're charged", body: "A heads-up 7 and 3 days before any renewal or trial conversion — never a surprise." }
];

// CHANGE 7: value before configuration. The retired 3-mode "choose your style"
// picker is gone; onboarding is a short trust narrative, then sign-in. The
// first-discovery launchpad lives at the Home empty state, free, after auth.
export default function OnboardingScreen() {
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>zeno</Text>
          <Text style={styles.headline}>The honest way to take back your subscriptions.</Text>
          <Text style={styles.body}>Built for people who refuse to hand a bank login to an app.</Text>
        </View>

        <View style={styles.beats}>
          {BEATS.map((beat) => (
            <View key={beat.title} style={styles.beatRow}>
              <View style={styles.beatIcon}>
                <beat.Icon size={20} color={theme.primary} strokeWidth={2} />
              </View>
              <View style={styles.beatText}>
                <Text style={styles.beatTitle}>{beat.title}</Text>
                <Text style={styles.beatBody}>{beat.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Get started" onPress={() => router.push("/login")} style={styles.startButton}>
            <Text style={styles.startButtonText}>Get started</Text>
          </Pressable>
          <View style={styles.bottomRow}>
            <Text style={styles.bottomHint}>Already have an account?</Text>
            <Pressable accessibilityRole="link" accessibilityLabel="Sign in" hitSlop={8} onPress={() => router.push("/login")}>
              <Text style={styles.bottomLink}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    scrollContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 28 },
    top: { marginTop: 8 },
    wordmark: { fontSize: 24, fontFamily: fonts.display.bold, letterSpacing: -0.5, color: theme.text, marginBottom: 28 },
    headline: { fontSize: 30, fontFamily: fonts.display.bold, lineHeight: 34, letterSpacing: -0.6, color: theme.text, marginBottom: 8 },
    body: { fontSize: 15, fontFamily: fonts.sans.regular, color: theme.mutedText, lineHeight: 22 },

    beats: { marginTop: 36, gap: 18 },
    beatRow: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
    beatIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primarySurface, alignItems: "center", justifyContent: "center" },
    beatText: { flex: 1, minWidth: 0 },
    beatTitle: { fontSize: 15, fontFamily: fonts.sans.bold, color: theme.text },
    beatBody: { fontSize: 13, fontFamily: fonts.sans.regular, color: theme.mutedText, marginTop: 2, lineHeight: 19 },

    footer: { marginTop: "auto", paddingTop: 32, gap: 16 },
    startButton: { width: "100%", backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 17, alignItems: "center", justifyContent: "center" },
    startButtonText: { fontSize: 17, fontFamily: fonts.sans.semibold, color: theme.onPrimary },
    bottomRow: { flexDirection: "row", justifyContent: "center", gap: 4 },
    bottomHint: { ...type.footnote, color: theme.mutedText },
    bottomLink: { ...type.footnote, fontFamily: fonts.sans.semibold, color: theme.primary }
  });
}
