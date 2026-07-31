import { router } from "expo-router";
import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useAuthStore } from "../src/auth/authStore";
import { Button, LedgerLine } from "../src/components/zeno";
import { printIn, useReducedMotion } from "../src/theme/motion";
import { type } from "../src/theme/typography";
import { fonts } from "../src/theme/zeno";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";

// The ledger that prints itself in beat 1. Illustrative sample figures, so the
// total is computed from them rather than asserted — a hardcoded total that
// didn't match its own rows would be exactly the dishonesty this app is against.
const SAMPLE_ROWS: readonly { name: string; minor: number }[] = [
  { name: "Netflix", minor: 1599 },
  { name: "Spotify", minor: 1099 },
  { name: "ChatGPT Plus", minor: 2000 },
  { name: "iCloud+", minor: 299 },
  { name: "Figma", minor: 1200 }
];
const SAMPLE_TOTAL = SAMPLE_ROWS.reduce((sum, r) => sum + r.minor, 0);
const money = (minor: number) => `$${(minor / 100).toFixed(2)}`;

// CHANGE 7: value before configuration. The retired 3-mode "choose your style"
// picker is gone; onboarding is a short trust narrative, then sign-in. The
// first-discovery launchpad lives at the Home empty state, free, after auth.
//
// Ported from Zeno Design System/ui_kits/app/OnboardingScreen.jsx: three beats,
// skippable — the ledger prints itself, then defiant type, then the promise.
// Its slop audit rejects the centre-hero + gradient-CTA-per-beat pattern and the
// 6-screen mascot tutorial; this is asymmetric editorial type on paper.
export default function OnboardingScreen() {
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const continueLocalOnly = useAuthStore((state) => state.continueLocalOnly);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  // "Your data stays on your device" (beat 2) has to be true even before
  // sign-in — this is the actual no-account path. Cloud sync, the AI coach, and
  // Family Vault stay gated behind a real login; everything device-local
  // (tracking, discovery, budgets, export, delete) works immediately.
  async function handleContinueLocalOnly() {
    await continueLocalOnly();
    router.replace("/dashboard");
  }

  const isLast = step === 2;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>zeno</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding" hitSlop={8} onPress={() => router.push("/login")} style={styles.skipBtn}>
          <Text style={styles.skip}>SKIP</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <View style={styles.beat}>
            <Text style={styles.headline}>Every subscription.{"\n"}One honest ledger.</Text>
            {/* the ledger prints itself — the signature entrance */}
            <View style={styles.ledgerTop}>
              {SAMPLE_ROWS.map((row, i) => (
                <Animated.View key={row.name} entering={reduced ? undefined : printIn(i)}>
                  <LedgerLine label={row.name} value={money(row.minor)} />
                </Animated.View>
              ))}
              <View style={styles.ledgerTotal}>
                <Animated.View entering={reduced ? undefined : printIn(SAMPLE_ROWS.length)}>
                  <LedgerLine label="Committed" value={`${money(SAMPLE_TOTAL)} /mo`} valueColor={theme.stampVerified} strong />
                </Animated.View>
              </View>
              <Text style={styles.sampleNote}>Sample figures — your ledger starts empty.</Text>
            </View>
          </View>
        ) : step === 1 ? (
          <View style={styles.beat}>
            <Text style={styles.kicker}>UNLIKE THE OTHERS</Text>
            <Text style={styles.headlineBig}>No bank login required.</Text>
            <Text style={styles.body}>
              Zeno reads receipts you show it — an email scan you start, or a statement you export yourself. Never your credentials.
            </Text>
          </View>
        ) : (
          <View style={styles.beat}>
            <Text style={styles.headline}>Warned before every charge.</Text>
            <Text style={styles.body}>
              7 days out, 3 days out, day of. Trials get flagged before they convert. Cancellations get verified — not assumed.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {/* progress ticks — ruled marks, not dots */}
        <View style={styles.ticks} accessible accessibilityLabel={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.tick, { backgroundColor: i <= step ? theme.primary : theme.ruleStrong }]} />
          ))}
        </View>

        <Button variant="primary" size="lg" fullWidth onPress={() => (isLast ? router.push("/login") : setStep((s) => s + 1))}>
          {isLast ? "Sign in" : "Continue"}
        </Button>

        {isLast ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue without an account"
            onPress={() => void handleContinueLocalOnly()}
            style={styles.localOnlyLink}
          >
            <Text style={styles.localOnlyLinkText}>Continue without an account</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 10 },
    wordmark: { fontSize: 19, fontFamily: fonts.display.bold, letterSpacing: -0.4, color: theme.text },
    skipBtn: { padding: 10 },
    skip: { fontSize: 10.5, fontFamily: fonts.mono.bold, letterSpacing: 1.7, color: theme.quietText },

    scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
    beat: { paddingVertical: 12 },
    kicker: { fontSize: 11, fontFamily: fonts.mono.bold, letterSpacing: 2.2, color: theme.primary, marginBottom: 14 },
    headline: { fontSize: 34, fontFamily: fonts.display.bold, lineHeight: 36, letterSpacing: -0.9, color: theme.text, marginBottom: 22 },
    headlineBig: { fontSize: 40, fontFamily: fonts.display.bold, lineHeight: 42, letterSpacing: -1.2, color: theme.text, marginBottom: 16 },
    body: { fontSize: 15.5, fontFamily: fonts.sans.regular, color: theme.mutedText, lineHeight: 24 },

    ledgerTop: { borderTopWidth: 1, borderColor: theme.ruleStrong, paddingTop: 4 },
    ledgerTotal: { borderTopWidth: 1, borderColor: theme.ruleStrong, marginTop: 4 },
    sampleNote: { fontSize: 10.5, fontFamily: fonts.mono.regular, letterSpacing: 0.6, color: theme.quietText, marginTop: 12 },

    footer: { paddingHorizontal: 24, paddingBottom: 30, gap: 14 },
    ticks: { flexDirection: "row", gap: 5 },
    tick: { width: 16, height: 2.5 },
    localOnlyLink: { alignItems: "center" },
    localOnlyLinkText: { ...type.footnote, color: theme.mutedText, textDecorationLine: "underline" }
  });
}
