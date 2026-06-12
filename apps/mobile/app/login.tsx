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
import { colors } from "../src/theme/colors";
import { spacing } from "../src/theme/spacing";
import { type } from "../src/theme/typography";

const TERMS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";

export default function LoginScreen() {
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
              <View style={styles.iconContainer}>
                <Text style={styles.brandIcon}>Z</Text>
              </View>
              <Text style={styles.appName}>Zeno</Text>
              <Text style={styles.tagline}>Know what you pay.</Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.inputBlock}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>{"\u2709"}</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    cursorColor={colors.blue}
                    editable={!isBusy}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    onSubmitEditing={handleMagicLink}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.label4}
                    returnKeyType="send"
                    selectionColor={colors.blue}
                    style={styles.input}
                    value={email}
                  />
                </View>

                {message ? (
                  <View style={styles.successState}>
                    <Text style={styles.successText}>
                      {"\u2713"}
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
                disabled={!canSubmitEmail}
                onPress={handleMagicLink}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: canSubmitEmail ? colors.blue : "rgba(10,132,255,0.4)",
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                {activeProvider === "magic" ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send sign-in link</Text>}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialStack}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={handleApple}
                  style={({ pressed }) => [
                    styles.appleButton,
                    {
                      opacity: pressed ? 0.88 : 1
                    }
                  ]}
                >
                  {activeProvider === "apple" ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.appleIcon}>Apple</Text>
                      <Text style={styles.appleButtonText}>Continue with Apple</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={handleGoogle}
                  style={({ pressed }) => [
                    styles.googleButton,
                    {
                      opacity: pressed ? 0.88 : 1
                    }
                  ]}
                >
                  {activeProvider === "google" ? <ActivityIndicator color={colors.label} /> : (
                    <>
                      <View style={styles.googleMark}>
                        <Text style={styles.googleMarkText}>G</Text>
                      </View>
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>

                {__DEV__ ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy || !canSubmitDemo}
                    onPress={handleDemoLogin}
                    style={({ pressed }) => [
                      styles.devButton,
                      {
                        opacity: pressed ? 0.9 : 1
                      }
                    ]}
                  >
                    {activeProvider === "demo" ? <ActivityIndicator color={colors.label} /> : <Text style={styles.devButtonText}>{"\uD83D\uDD27"} Dev login</Text>}
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.privacyTextBase}>
              By continuing you agree to our
              <Text onPress={() => openLink(TERMS_URL)} style={styles.privacyLink}>
                {" Terms"}
              </Text>
              <Text style={styles.privacyTextBase}> and </Text>
              <Text onPress={() => openLink(PRIVACY_URL)} style={styles.privacyLink}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {isBusy ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
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
    backgroundColor: colors.blue,
    marginBottom: 20
  },
  brandIcon: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -2
  },
  appName: {
    color: colors.label,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1
  },
  tagline: {
    ...type.callout,
    color: colors.label3,
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
    color: colors.label3
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  inputIcon: {
    fontSize: 16,
    color: colors.label3
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.label,
    paddingVertical: 0
  },
  successState: {
    backgroundColor: "rgba(48,209,88,0.08)",
    borderColor: "rgba(48,209,88,0.3)",
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  successText: {
    color: colors.green,
    fontSize: 14
  },
  successMessage: {
    ...type.footnote,
    color: colors.green
  },
  primaryButton: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#fff",
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
    backgroundColor: colors.separator
  },
  dividerText: {
    ...type.footnote,
    color: colors.label4
  },
  socialStack: {
    gap: 12
  },
  appleButton: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  appleIcon: {
    color: "#000",
    fontSize: 20,
    fontWeight: "700"
  },
  appleButtonText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "600"
  },
  googleButton: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 0.5,
    borderColor: colors.separatorOpaque,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  googleMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  googleMarkText: {
    color: "#4285F4",
    fontSize: 12,
    fontWeight: "700"
  },
  googleButtonText: {
    color: colors.label,
    fontSize: 17,
    fontWeight: "600"
  },
  devButton: {
    width: "100%",
    backgroundColor: colors.surfaceHigh,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4
  },
  devButtonText: {
    color: colors.label3,
    fontSize: 15,
    fontWeight: "500"
  },
  errorState: {
    backgroundColor: "rgba(255,69,58,0.08)",
    borderColor: "rgba(255,69,58,0.2)",
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  errorText: {
    ...type.footnote,
    color: colors.red
  },
  bottomSection: {
    marginTop: 24
  },
  privacyTextBase: {
    ...type.caption1,
    color: colors.label4,
    textAlign: "center"
  },
  privacyLink: {
    color: colors.blue,
    ...type.caption1
  },
  overlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  }
});
