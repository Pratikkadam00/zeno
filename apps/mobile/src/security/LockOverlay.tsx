import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fingerprint, ShieldCheck } from "lucide-react-native";
import { useAuthStore } from "../auth/authStore";
import { useZenoTheme } from "../theme/theme-provider";
import { useLockStore } from "./lock-store";
import { useBlockScreenCapture } from "./screen-capture";
import { CodeBoxes } from "../components/zeno";
import { haptics } from "../theme/haptics";

const PIN_MAX = 8;
const PIN_CHECK_FAILED = "Couldn't check your PIN. Try again.";
const BIOMETRIC_FAILED = "Couldn't use biometrics. Enter your PIN.";

// Full-screen lock shown over the app whenever the lock is enabled and engaged.
// Biometric is attempted automatically (with a working PIN fallback), so a device
// without enrolled biometrics is still protected by the PIN — never open.
export function LockOverlay() {
  const { theme } = useZenoTheme();
  const { ready, biometricAvailable, tryBiometric, tryPin } = useLockStore();
  const logout = useAuthStore((s) => s.logout);
  const [pin, setPin] = useState("");
  const inputRef = useRef<TextInput>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const attemptedBiometric = useRef(false);
  // P3.7: no screenshot or recording of the lock screen or the PIN being typed.
  useBlockScreenCapture("lock-overlay");

  useEffect(() => {
    if (!ready || !biometricAvailable) return;
    // The overlay can now be mounted while the app is in the BACKGROUND (the
    // lock engages on the way out so the switcher thumbnail is the cover, not
    // the ledger). Prompting for biometrics then would fire into a backgrounded
    // activity and fail, burning the one automatic attempt. Attempt only while
    // active; if we mounted in the background, attempt when we come back.
    const attempt = () => {
      if (attemptedBiometric.current || AppState.currentState !== "active") return;
      attemptedBiometric.current = true;
      void tryBiometric().catch(() => setError(BIOMETRIC_FAILED));
    };
    attempt();
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") attempt(); });
    return () => sub.remove();
  }, [ready, biometricAvailable, tryBiometric]);

  // Before the lock store has hydrated we don't yet know whether a PIN is set, so
  // show a neutral opaque cover (never the app content, never the PIN prompt).
  if (!ready) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: theme.background }]}>
        <ShieldCheck size={26} color={theme.mutedText} strokeWidth={2} />
      </View>
    );
  }

  // The check reads and writes the keychain, which can throw. A failure must not
  // leave `busy` stuck (the field would stay read-only until a restart) or
  // surface as an unhandled rejection: fail CLOSED (still locked), say so, and
  // let the user retry. No attempt is counted, since none was checked (F28).
  const submit = async (value: string) => {
    if (busy || value.length < 4) return;
    setBusy(true);
    try {
      const result = await tryPin(value);
      if (!result.ok) {
        setError(result.error ?? "Incorrect PIN.");
        setPin("");
      }
    } catch {
      setError(PIN_CHECK_FAILED);
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <ShieldCheck size={26} color={theme.mutedText} strokeWidth={2} />
        <Text style={[styles.title, { color: theme.text }]}>Zeno is locked</Text>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>Enter your PIN to continue.</Text>

        {/* PIN reads as CODE BOXES (the DS element for entered codes), with the
            real TextInput kept invisible behind them so the number-pad, secure
            entry and accessibility behaviour are all unchanged. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter PIN"
          onPress={() => inputRef.current?.focus()}
          style={{ marginTop: 6 }}
        >
          <CodeBoxes code={"•".repeat(pin.length)} length={Math.max(4, pin.length || 4)} size={40} />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={pin}
          onChangeText={(next) => {
            setError(null);
            const digits = next.replace(/[^0-9]/g, "").slice(0, PIN_MAX);
            setPin(digits);
            haptics.pinDigit();
            if (digits.length >= 4) void submit(digits);
          }}
          keyboardType="number-pad"
          secureTextEntry
          // A secure field with no autofill opt-out is treated as a PASSWORD field
          // by Android autofill / iOS password AutoFill: managers offer to save or
          // fill it, and the keyboard may suggest. A device PIN must never reach
          // any of those. oneTimeCode is the iOS content type that opts out of
          // credential AutoFill without disabling the number pad.
          importantForAutofill="no"
          autoComplete="off"
          textContentType="oneTimeCode"
          autoCorrect={false}
          spellCheck={false}
          contextMenuHidden
          autoFocus
          maxLength={PIN_MAX}
          editable={!busy}
          accessibilityLabel="PIN"
          returnKeyType="done"
          onSubmitEditing={() => void submit(pin)}
        />

        {error ? <Text style={[styles.error, { color: theme.dangerText }]}>{error}</Text> : null}

        {biometricAvailable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unlock with biometrics"
            style={[styles.bioBtn, { borderColor: theme.border }]}
            onPress={() => void tryBiometric().catch(() => setError(BIOMETRIC_FAILED))}
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
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
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
