import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
import { useSubRadarTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";
import { spacing } from "../src/theme/spacing";
import { type } from "../src/theme/typography";
import { withAlpha } from "../src/utils/subscription-ui";

const TERMS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";

// Brand button colors — intentionally theme-invariant (Apple/Google guidelines).
const APPLE_BUTTON_BG = "#FFFFFF";
const APPLE_BUTTON_TEXT = "#000000";
const GOOGLE_BRAND_BLUE = "#4285F4";

export default function LoginScreen() {
  const { theme } = useSubRadarTheme();
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
  const [demoEmail, setDemoEmail] = useState("demo@zeno.local");
  const [demoPassword, setDemoPassword] = useState("Zeno-Demo-2026!");
  const [message, setMessage] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<"magic" | "demo" | "apple" | "google" | null>(null);

  const isBusy = status === "loading" || status === "pending" || activeProvider !== null;
  const canSubmitEmail = useMemo(
    () => email.trim().length > 3 && email.includes("@") && !isBusy,
    [email, isBusy]
  );
  const canSubmitDemo = useMemo(
    () => demoEmail.trim().length > 3 && demoPassword.length > 0 && !isBusy,
    [demoEmail, demoPassword, isBusy]
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
    } finally {
      setActiveProvider(null);
    }
  }

  async function handleApple() {
    setActiveProvider("apple");
    setMessage(null);
    try {
      await loginWithApple();
    } finally {
      setActiveProvider(null);
    }
  }

  async function handleDemoLogin() {
    if (!canSubmitDemo) {
      return;
    }

    setActiveProvider("demo");
    setMessage(null);
    try {
      await loginWithDemoAccount(demoEmail, demoPassword);
    } finally {
      setActiveProvider(null);
    }
  }

  async function handleGoogle() {
    setActiveProvider("google");
    setMessage(null);
    try {
      await loginWithGoogle();
    } finally {
      setActiveProvider(null);
    }
  }

  function openLink(url: string): void {
    void Linking.openURL(url);
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
                    backgroundColor: canSubmitEmail ? theme.primary : withAlpha(theme.primary, 0.4),
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                {activeProvider === "magic" ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.primaryButtonText}>Send sign-in link</Text>}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialStack}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                  disabled={isBusy}
                  onPress={handleApple}
                  style={({ pressed }) => [
                    styles.appleButton,
                    {
                      opacity: pressed ? 0.88 : 1
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

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  disabled={isBusy}
                  onPress={handleGoogle}
                  style={({ pressed }) => [
                    styles.googleButton,
                    {
                      opacity: pressed ? 0.88 : 1
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

          <View style={styles.bottomSection}>
            <Text style={styles.privacyTextBase}>
              By continuing you agree to our
              <Text accessibilityRole="link" onPress={() => openLink(TERMS_URL)} style={styles.privacyLink}>
                {" Terms"}
              </Text>
              <Text style={styles.privacyTextBase}> and </Text>
              <Text accessibilityRole="link" onPress={() => openLink(PRIVACY_URL)} style={styles.privacyLink}>
                Privacy Policy
              </Text>
            </Text>
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
    inputContainer: {
      backgroundColor: theme.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
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
    successState: {
      backgroundColor: theme.successSurface,
      borderColor: withAlpha(theme.success, 0.3),
      borderWidth: 0.5,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    successText: {
      color: theme.success,
      fontSize: 14
    },
    successMessage: {
      ...type.footnote,
      color: theme.success
    },
    primaryButton: {
      width: "100%",
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryButtonText: {
      color: theme.onPrimary,
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
    dividerText: {
      ...type.footnote,
      color: theme.quietText
    },
    socialStack: {
      gap: 12
    },
    appleButton: {
      width: "100%",
      backgroundColor: APPLE_BUTTON_BG,
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 0.5,
      borderColor: theme.border
    },
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
    googleButton: {
      width: "100%",
      backgroundColor: theme.card,
      borderRadius: 14,
      paddingVertical: 15,
      borderWidth: 0.5,
      borderColor: theme.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10
    },
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
    errorState: {
      backgroundColor: theme.dangerSurface,
      borderColor: withAlpha(theme.danger, 0.2),
      borderWidth: 0.5,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    errorText: {
      ...type.footnote,
      color: theme.danger
    },
    bottomSection: {
      marginTop: 24
    },
    privacyTextBase: {
      ...type.caption1,
      color: theme.quietText,
      textAlign: "center"
    },
    privacyLink: {
      color: theme.primary,
      ...type.caption1
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
