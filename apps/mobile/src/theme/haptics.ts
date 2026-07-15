import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/* ============================================================
   Haptics vocabulary — the felt half of the motion system.
   Each entry maps a DS interaction (tokens/motion.css "Haptics map") to an
   expo-haptics call. Paired with the matching animation at the call site
   (e.g. the Stamp's thunk spring lands together with haptics.stampLanded()).
   ============================================================ */

// expo-haptics is unsupported on web; gate there. Native calls are
// fire-and-forget and swallow errors — a missing Taptic Engine or a denied
// permission must never surface to the user or block an interaction.
const supported = Platform.OS === "ios" || Platform.OS === "android";

function fire(run: () => Promise<void>): void {
  if (!supported) {
    return;
  }
  void run().catch(() => {
    // best-effort — haptics are a nicety, never a hard dependency
  });
}

export const haptics = {
  /** A verified-cancel Stamp lands (the app's one celebration). */
  stampLanded: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** "Still charging" — a cancellation that didn't actually take. */
  stillCharging: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** A ledger row press or tab switch. */
  rowPress: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A primary action button press. */
  primaryAction: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A PIN / security-code digit entered. */
  pinDigit: () => fire(() => Haptics.selectionAsync())
} as const;
