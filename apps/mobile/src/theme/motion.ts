import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { FadeInDown, type WithSpringConfig } from "react-native-reanimated";
import { motion } from "./zeno";

/* ============================================================
   Motion system — "Everything settles like paper."
   Rows print in and settle; stamps thunk down; sheets tear off a roll.
   Nothing bounces playfully, nothing floats — paper has weight.
   Reanimated 4 mapping of the DS motion spec (tokens/motion.css).
   Transform + opacity only, so every animation is FlatList- and
   reduced-motion-safe.
   ============================================================ */

// Spring configs. settle = values/rows landing; thunk = the Stamp; sheet = the
// bottom sheet spring (also passed to @gorhom/bottom-sheet's animationConfigs).
export const springs = {
  settle: { damping: 22, stiffness: 260 },
  thunk: { damping: 14, stiffness: 420 },
  sheet: { damping: 24, stiffness: 260 }
} as const satisfies Record<string, WithSpringConfig>;

export const PRINT_STAGGER_MS = motion.printStagger; // 45
export const PRINT_DURATION_MS = 240;

/**
 * print-in entrance for a ledger row: fades and rises into place, staggered by
 * its list index so a page of rows prints top-to-bottom like a receipt. Use as
 * `entering={printIn(index)}` on an Animated view. Transform+opacity only.
 */
export function printIn(index = 0) {
  return FadeInDown.duration(PRINT_DURATION_MS).delay(index * PRINT_STAGGER_MS);
}

/**
 * Live "reduce motion" flag from the OS accessibility setting. Reads once on
 * mount, then updates if the user toggles it. Callers collapse entrances to
 * opacity-only (or skip springs) when this is true — the paper stops moving.
 */
// F107: the OS answer arrives asynchronously, so a component's FIRST effect
// used to run as if motion were allowed: a Stamp mounted under reduce-motion
// still sprang in from 1.7x and fired its haptic before the answer landed. The
// last answer known in this app run is kept here, so every component mounting
// after the first read (the launch splash reads it) starts from the real value.
let lastKnownReduced = false;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(lastKnownReduced);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        lastKnownReduced = value;
        if (mounted) {
          setReduced(value);
        }
      })
      .catch(() => {
        // RN rejects when its accessibility native module is unavailable. Keep
        // the default (motion on) rather than leak an unhandled rejection from
        // every animated component; the listener below still applies toggles.
      });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      lastKnownReduced = value;
      setReduced(value);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
