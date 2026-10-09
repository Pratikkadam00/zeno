import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../src/auth/authStore";
import { getLegalUrls } from "../src/config/site";
import { openExternalUrl } from "../src/utils/external-link";
import { useZenoTheme } from "../src/theme/theme-provider";
import { fonts } from "../src/theme/zeno";
import type { ThemeTokens } from "../src/theme/tokens";
import { spacing } from "../src/theme/spacing";
import { type } from "../src/theme/typography";
import { withAlpha } from "../src/utils/subscription-ui";

const { terms: TERMS_URL, privacy: PRIVACY_URL } = getLegalUrls();
// Minimum age to use Zeno. Matches the Privacy Policy (Children's Privacy) and
// keeps us clear of COPPA (under-13) and most minor-data regimes.
const MINIMUM_AGE = 16;

// Brand button colors — intentionally theme-invariant (Apple/Google guidelines).
const APPLE_BUTTON_BG = "#FFFFFF";
const APPLE_BUTTON_TEXT = "#000000";
const GOOGLE_BRAND_BLUE = "#4285F4";

export default function LoginScreen() {
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    status,
    isAuthenticated,
    error,
    loginWithMagicLink,
    loginWithDemoAccount,
    loginWithApple,
    loginWithGoogle
  } = useAuthStore();

  const [email, setEmail] = useState("");
  // Only pre-fill the demo credentials in development builds; in production the
  // server disables demo login anyway, and we don't ship the values in the bundle UI.
  const demoEmail = __DEV__ ? "demo@zeno.local" : "";
  const demoPassword = __DEV__ ? "Zeno-Demo-2026!" : "";
  const [message, setMessage] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<"magic" | "demo" | "apple" | "google" | null>(null);
  // Age + consent gate: must be checked before any sign-in method is enabled.
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const isBusy = status === "loading" || status === "pending" || activeProvider !== null;
  const canSubmitEmail = useMemo(
    () => email.trim().length > 3 && email.includes("@") && ageConfirmed && !isBusy,
    [email, ageConfirmed, isBusy]
  );
  const canSubmitDemo = useMemo(
    () => demoEmail.trim().length > 3 && demoPassword.length > 0 && ageConfirmed && !isBusy,
    [demoEmail, demoPassword, ageConfirmed, isBusy]
  );

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated]);

  async function handleMagicLink() {
    if (!canSubmitEmail) {
      return;
    }

    setActiveProvider("magic");
    setMessage(null);
    try {
      await loginWithMagicLink(email);
      setMessage("Check your email for a sign-in link");
    } catch {
      // authStore already surfaces the failure via `error` state (rendered
      // below); rethrowing here would just be an unhandled promise rejection
      // since nothing awaits this onPress handler's return value.
    } finally {
      setActiveProvider(null);
    }
  }

  // Apple, Google and the demo account are reached only through their buttons,
  // which are disabled until consent is given and while anything is in flight.
  // (The magic link also has the keyboard's send key, hence its own guard.)
  async function handleApple() {
    setActiveProvider("apple");
    setMessage(null);
    try {
      await loginWithApple();
    } catch {
      // See handleMagicLink — authStore already surfaces the error via state.
    } finally {
      setActiveProvider(null);
    }
  }

  async function handleDemoLogin() {
    setActiveProvider("demo");
    setMessage(null);
    try {
      await loginWithDemoAccount(demoEmail, demoPassword);
    } catch {
      // See handleMagicLink — authStore already surfaces the error via state.
    } finally {
      setActiveProvider(null);
    }
  }

  async function handleGoogle() {
    setActiveProvider("google");
    setMessage(null);
    try {
      await loginWithGoogle();
    } catch {
      // See handleMagicLink — authStore already surfaces the error via state.
    } finally {
      setActiveProvider(null);
    }
  }

  function openLink(url: string): void {
    void openExternalUrl(url);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.brandBlock}>
              <View style={styles.iconContainer} accessible={false} importantForAccessibility="no-hide-descendants">
                <Text style={styles.brandIcon}>Z</Text>
              </View>
              <Text style={styles.appName}>Zeno</Text>
              <Text style={styles.tagline}>Know what you pay.</Text>
            </View>

            <View style={styles.formSection}>
          <View style={styles.bottomSection}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ageConfirmed }}
              accessibilityLabel={`I am at least ${MINIMUM_AGE} years old and agree to the Terms and Privacy Policy`}
              onPress={() => setAgeConfirmed((prev) => !prev)}
              style={styles.consentRow}
            >
              <View style={[styles.checkbox, ageConfirmed ? styles.checkboxChecked : null]}>
                {ageConfirmed ? <Text style={styles.checkboxTick} accessible={false}>{"✓"}</Text> : null}
              </View>
              <Text style={styles.privacyTextBase}>
                {`I'm at least ${MINIMUM_AGE} and agree to the`}
                <Text accessibilityRole="link" onPress={() => openLink(TERMS_URL)} style={styles.privacyLink}>
                  {" Terms"}
                </Text>
                <Text style={styles.privacyTextBase}> and </Text>
                <Text accessibilityRole="link" onPress={() => openLink(PRIVACY_URL)} style={styles.privacyLink}>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>
          </View>
          <Text style={styles.signHint}>SIGN THE LINE TO CONTINUE</Text>

              <View style={styles.inputBlock}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon} accessible={false}>{"✉"}</Text>
                  <TextInput
                    accessibilityLabel="Email address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    cursorColor={theme.primary}
                    editable={!isBusy}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    onSubmitEditing={handleMagicLink}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.quietText}
                    returnKeyType="send"
                    selectionColor={theme.primary}
                    style={styles.input}
                    value={email}
                  />
                </View>

                {message ? (
                  <View style={styles.successState}>
                    <Text style={styles.successText} accessible={false}>
                      {"✓"}
                    </Text>
                    <Text style={styles.successMessage}>{message}</Text>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorState}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmitEmail }}
                disabled={!canSubmitEmail}
                onPress={handleMagicLink}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: canSubmitEmail ? theme.buttonPrimaryBg : withAlpha(theme.buttonPrimaryBg, 0.4),
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                {activeProvider === "magic" ? <ActivityIndicator color={theme.buttonPrimaryText} /> : <Text style={styles.primaryButtonText}>Send sign-in link</Text>}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialStack}>
                {/* F132: iOS only. On Android this button could only fail ("Sign in
                    with Apple is only available on supported Apple devices"). */}
                {Platform.OS === "ios" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                  accessibilityState={{ disabled: isBusy || !ageConfirmed }}
                  disabled={isBusy || !ageConfirmed}
                  onPress={handleApple}
                  style={({ pressed }) => [
                    styles.appleButton,
                    {
                      opacity: !ageConfirmed ? 0.5 : pressed ? 0.88 : 1
                    }
                  ]}
                >
                  {activeProvider === "apple" ? <ActivityIndicator color={APPLE_BUTTON_TEXT} /> : (
                    <>
                      <Text style={styles.appleIcon}>Apple</Text>
                      <Text style={styles.appleButtonText}>Continue with Apple</Text>
                    </>
                  )}
                </Pressable>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  accessibilityState={{ disabled: isBusy || !ageConfirmed }}
                  disabled={isBusy || !ageConfirmed}
                  onPress={handleGoogle}
                  style={({ pressed }) => [
                    styles.googleButton,
                    {
                      opacity: !ageConfirmed ? 0.5 : pressed ? 0.88 : 1
                    }
                  ]}
                >
                  {activeProvider === "google" ? <ActivityIndicator color={theme.text} /> : (
                    <>
                      <View style={styles.googleMark} accessible={false} importantForAccessibility="no-hide-descendants">
                        <Text style={styles.googleMarkText}>G</Text>
                      </View>
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>

                {__DEV__ ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Developer login"
                    disabled={isBusy || !canSubmitDemo}
                    onPress={handleDemoLogin}
                    style={({ pressed }) => [
                      styles.devButton,
                      {
                        opacity: pressed ? 0.9 : 1
                      }
                    ]}
                  >
                    {activeProvider === "demo" ? <ActivityIndicator color={theme.text} /> : <Text style={styles.devButtonText}>{"🔧"} Dev login</Text>}
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {isBusy ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
      position: "relative"
    },
    keyboard: {
      flex: 1
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "space-between",
      paddingBottom: 40,
      paddingHorizontal: 24
    },
    topSection: {
      flex: 1,
      justifyContent: "center",
      paddingTop: 60
    },
    brandBlock: {
      alignItems: "center",
      marginBottom: 48
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      marginBottom: 20
    },
    brandIcon: {
      color: theme.onPrimary,
      fontSize: 40,
      fontWeight: "800",
      letterSpacing: -2
    },
    appName: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "700",
      letterSpacing: -1
    },
    tagline: {
      ...type.callout,
      color: theme.mutedText,
      marginTop: 4,
      textAlign: "center"
    },
    formSection: {
      gap: spacing.sectionGap - 8
    },
    inputBlock: {
      gap: 8
    },
    fieldLabel: {
      ...type.footnote,
      color: theme.mutedText
    },
    inputContainer: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: theme.ruleStrong, borderRadius: 8, paddingHorizontal: 12, minHeight: 50 },
    inputIcon: {
      fontSize: 16,
      color: theme.mutedText
    },
    input: {
      flex: 1,
      ...type.body,
      color: theme.text,
      paddingVertical: 0
    },
    successState: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.rule, paddingVertical: 10, marginTop: 12 },
    successText: { fontFamily: fonts.mono.bold, fontSize: 14, color: theme.stampVerified },
    successMessage: {
      ...type.footnote,
      color: theme.successText
    },
    primaryButton: { width: "100%", borderRadius: 12, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
    primaryButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: 17,
      fontWeight: "600"
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 24
    },
    dividerLine: {
      flex: 1,
      height: 0.5,
      backgroundColor: theme.border
    },
    dividerText: { fontFamily: fonts.mono.bold, fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase", color: theme.quietText, paddingHorizontal: 10 },
    socialStack: {
      gap: 12
    },
    appleButton: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: APPLE_BUTTON_BG, borderWidth: 1, borderColor: theme.ruleStrong, borderRadius: 12, paddingVertical: 15 },
    appleIcon: {
      color: APPLE_BUTTON_TEXT,
      fontSize: 20,
      fontWeight: "700"
    },
    appleButtonText: {
      color: APPLE_BUTTON_TEXT,
      fontSize: 17,
      fontWeight: "600"
    },
    googleButton: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: theme.ruleStrong, borderRadius: 12, paddingVertical: 15 },
    googleMark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center"
    },
    googleMarkText: {
      color: GOOGLE_BRAND_BLUE,
      fontSize: 12,
      fontWeight: "700"
    },
    googleButtonText: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "600"
    },
    devButton: {
      width: "100%",
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4
    },
    devButtonText: {
      color: theme.mutedText,
      fontSize: 15,
      fontWeight: "500"
    },
    errorState: { borderLeftWidth: 3, borderLeftColor: theme.stampAlert, paddingLeft: 12, marginTop: 12 },
    errorText: { fontSize: 13.5, fontFamily: fonts.sans.regular, color: theme.text, lineHeight: 20 },
    signHint: { fontFamily: fonts.mono.bold, fontSize: 9, letterSpacing: 1.4, color: theme.quietText, marginLeft: 2, marginBottom: 14 },
    bottomSection: { marginBottom: 4 },
    privacyTextBase: {
      ...type.caption1,
      color: theme.quietText,
      textAlign: "center"
    },
    privacyLink: {
      color: theme.primary,
      ...type.caption1
    },
    consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 11, minHeight: 48 },
    checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: theme.ruleStrong, alignItems: "center", justifyContent: "center", marginTop: 1 },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary
    },
    checkboxTick: {
      color: theme.onPrimary,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 16
    },
    overlay: {
      position: "absolute",
      inset: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.overlay
    }
  });
}
