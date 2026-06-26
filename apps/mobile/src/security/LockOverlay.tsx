import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fingerprint, ShieldCheck } from "lucide-react-native";
import { useAuthStore } from "../auth/authStore";
import { useZenoTheme } from "../theme/theme-provider";
import { useLockStore } from "./lock-store";

const PIN_MAX = 8;

// Full-screen lock shown over the app whenever the lock is enabled and engaged.
// Biometric is attempted automatically (with a working PIN fallback), so a device
// without enrolled biometrics is still protected by the PIN — never open.
export function LockOverlay() {
  const { theme } = useZenoTheme();
  const { biometricAvailable, tryBiometric, tryPin } = useLockStore();
  const logout = useAuthStore((s) => s.logout);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptedBiometric = useRef(false);

  useEffect(() => {
    if (biometricAvailable && !attemptedBiometric.current) {
      attemptedBiometric.current = true;
      void tryBiometric();
    }
  }, [biometricAvailable, tryBiometric]);

  const submit = async (value: string) => {
    if (busy || value.length < 4) return;
    setBusy(true);
    const result = await tryPin(value);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Incorrect PIN.");
      setPin("");
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: theme.primarySurface }]}>
          <ShieldCheck size={28} color={theme.primary} strokeWidth={2.4} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Zeno is locked</Text>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>Enter your PIN to continue.</Text>

        <TextInput
          style={[styles.input, { color: theme.text, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.surface }]}
          value={pin}
          onChangeText={(next) => {
            setError(null);
            const digits = next.replace(/[^0-9]/g, "").slice(0, PIN_MAX);
            setPin(digits);
            if (digits.length >= 4) void submit(digits);
          }}
          keyboardType="number-pad"
          secureTextEntry
          autoFocus
          maxLength={PIN_MAX}
          editable={!busy}
          accessibilityLabel="PIN"
          placeholder="••••"
          placeholderTextColor={theme.quietText}
          returnKeyType="done"
          onSubmitEditing={() => void submit(pin)}
        />

        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

        {biometricAvailable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unlock with biometrics"
            style={[styles.bioBtn, { borderColor: theme.border }]}
            onPress={() => void tryBiometric()}
          >
            <Fingerprint size={18} color={theme.text} strokeWidth={2.2} />
            <Text style={[styles.bioText, { color: theme.text }]}>Use Face ID / fingerprint</Text>
          </Pressable>
        ) : null}

        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" style={styles.signOut} onPress={() => void logout()}>
          <Text style={[styles.signOutText, { color: theme.mutedText }]}>Sign out instead</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 15, textAlign: "center" },
  input: {
    marginTop: 12,
    width: 200,
    height: 56,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "700"
  },
  error: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  bioBtn: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderWidth: 1, borderRadius: 14 },
  bioText: { fontSize: 15, fontWeight: "700" },
  signOut: { marginTop: 16, padding: 8 },
  signOutText: { fontSize: 14, fontWeight: "600" }
});
