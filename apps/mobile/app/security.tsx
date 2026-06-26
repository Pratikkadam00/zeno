import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { verifyPin } from "../src/security/app-lock";
import { useLockStore } from "../src/security/lock-store";
import { useZenoTheme } from "../src/theme/theme-provider";

const MIN_PIN = 4;
const MAX_PIN = 8;

export default function SecurityScreen() {
  const { theme } = useZenoTheme();
  const { enabled, biometricAvailable, enableWithPin, disable } = useLockStore();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [current, setCurrent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const digits = (value: string) => value.replace(/[^0-9]/g, "").slice(0, MAX_PIN);

  const turnOn = async () => {
    if (pin.length < MIN_PIN) return setError(`PIN must be at least ${MIN_PIN} digits.`);
    if (pin !== confirm) return setError("PINs don't match.");
    setBusy(true);
    await enableWithPin(pin);
    setBusy(false);
    router.back();
  };

  const turnOff = async () => {
    setBusy(true);
    const ok = await verifyPin(current);
    if (!ok) {
      setBusy(false);
      return setError("Incorrect PIN.");
    }
    await disable();
    setBusy(false);
    router.back();
  };

  const input = (value: string, onChange: (v: string) => void, label: string, placeholder: string) => (
    <TextInput
      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
      value={value}
      onChangeText={(next) => {
        setError(null);
        onChange(digits(next));
      }}
      keyboardType="number-pad"
      secureTextEntry
      maxLength={MAX_PIN}
      editable={!busy}
      accessibilityLabel={label}
      placeholder={placeholder}
      placeholderTextColor={theme.quietText}
    />
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]} edges={["bottom"]}>
      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: theme.primarySurface }]}>
          <ShieldCheck size={26} color={theme.primary} strokeWidth={2.4} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>App lock</Text>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>
          {enabled
            ? "App lock is on. Zeno asks for your PIN (or biometrics) when you open it."
            : `Protect your financial data with a ${MIN_PIN}–${MAX_PIN} digit PIN.${biometricAvailable ? " Face ID / fingerprint will be used when available, with your PIN as the fallback." : ""}`}
        </Text>

        {enabled ? (
          <>
            <Text style={[styles.label, { color: theme.mutedText }]}>Enter current PIN to turn off</Text>
            {input(current, setCurrent, "Current PIN", "••••")}
            {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Turn off app lock"
              style={[styles.btn, { backgroundColor: theme.dangerSurface }]}
              disabled={busy}
              onPress={() => void turnOff()}
            >
              <Text style={[styles.btnText, { color: theme.danger }]}>Turn off app lock</Text>
            </Pressable>
          </>
        ) : (
          <>
            {input(pin, setPin, "New PIN", "New PIN")}
            {input(confirm, setConfirm, "Confirm PIN", "Confirm PIN")}
            {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Turn on app lock"
              style={[styles.btn, { backgroundColor: theme.primary }]}
              disabled={busy}
              onPress={() => void turnOn()}
            >
              <Text style={[styles.btnText, { color: theme.onPrimary }]}>Turn on app lock</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 12 },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  input: { height: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 18, fontWeight: "700", letterSpacing: 4 },
  error: { fontSize: 13, fontWeight: "600" },
  btn: { marginTop: 8, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "800" }
});
