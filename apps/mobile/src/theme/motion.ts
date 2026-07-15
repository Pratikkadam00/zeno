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
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) {
        setReduced(value);
      }
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
