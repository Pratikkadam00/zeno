import { useEffect, type ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useZenoTokens } from "../../theme/useZenoTokens";
import { springs, useReducedMotion } from "../../theme/motion";
import { haptics } from "../../theme/haptics";

/* ============================================================
   Zeno Ledger Kit — the named signature elements of "The Honest Ledger".
   RN ports of Zeno Design System/ui_kits/app/Ledger.jsx. Every element here
   appears on 3+ screens — that's the contract. Transform+opacity only.
   (BottomSheet, TallyNumber, and the Button/Card ink refresh land in the rest
   of M2.)
   ============================================================ */

/* ③ SectionHead — caps-mono column head with a trailing hairline rule. */
export function SectionHead({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useZenoTokens();
  const c = t.color;
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", columnGap: 10, paddingTop: 26, paddingBottom: 10, paddingHorizontal: 20 }, style]}>
      <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", color: c.textTertiary }}>{children}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.rule }} />
      {right}
    </View>
  );
}

/* ③b ColumnHeads — table header for ledger lists ("SERVICE … AMOUNT"). */
export function ColumnHeads({ left, right, style }: { left: string; right: string; style?: StyleProp<ViewStyle> }) {
  const t = useZenoTokens();
  const c = t.color;
  const head = { fontFamily: t.fonts.mono.bold, fontSize: 9, letterSpacing: 1.6, color: c.textTertiary } as const;
  return (
    <View style={[{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 6, borderBottomWidth: 1, borderColor: c.ruleStrong }, style]}>
      <Text style={head}>{left}</Text>
      <Text style={head}>{right}</Text>
    </View>
  );
}

/* ① LedgerLine — label ……… mono value. The signature row. */
export function LedgerLine({
  label,
  sub,
  value,
  valueColor,
  strong = false,
  size = 14,
  style
}: {
  label: string;
  sub?: string;
  value: string;
  valueColor?: string;
  strong?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useZenoTokens();
  const c = t.color;
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", columnGap: 10, paddingVertical: 7 }, style]}>
      <Text style={{ fontFamily: strong ? t.fonts.sans.bold : t.fonts.sans.medium, fontSize: size, color: strong ? c.textPrimary : c.textSecondary }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 10, color: c.textTertiary, letterSpacing: 0.4 }}>{sub}</Text> : null}
      {/* dotted leader connecting label to value */}
      <View style={{ flex: 1, minWidth: 14, height: 0, borderBottomWidth: 2, borderStyle: "dotted", borderColor: c.ruleStrong, transform: [{ translateY: -3 }] }} />
      <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: size + 1, color: valueColor ?? c.textPrimary, letterSpacing: -0.14 }}>{value}</Text>
    </View>
  );
}

/* ② The Zeno Stamp — inked verification mark. Thunks down (withSpring, damping 14
   / stiffness 420) with a Success haptic; reduced motion fades it in. Double-ring
   (outer 1px outline + inner 2.5px border) emulates the web's border+outline. */
export type StampTone = "verified" | "alert" | "neutral";
export type StampSize = "sm" | "md" | "lg";
export function Stamp({
  tone = "verified",
  children,
  sub,
  angle = -5,
  size = "md",
  animate = false,
  style
}: {
  tone?: StampTone;
  children: string;
  sub?: string;
  angle?: number;
  size?: StampSize;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useZenoTokens();
  const c = t.color;
  const reduced = useReducedMotion();
  const color = tone === "alert" ? c.stampAlert : tone === "neutral" ? c.textTertiary : c.stampVerified;
  const dims = size === "lg" ? { fs: 17, py: 14, px: 22, sub: 10 } : size === "sm" ? { fs: 10, py: 4, px: 9, sub: 8 } : { fs: 13, py: 9, px: 16, sub: 9 };

  const scale = useSharedValue(animate && !reduced ? 1.7 : 1);
  const opacity = useSharedValue(animate ? 0 : 0.94);
  useEffect(() => {
    if (!animate) {
      return;
    }
    if (reduced) {
      opacity.value = withTiming(0.94, { duration: 200 });
      return;
    }
    opacity.value = withTiming(0.94, { duration: 120 });
    scale.value = withSpring(1, springs.thunk);
    haptics.stampLanded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${angle}deg` }, { scale: scale.value }]
  }));

  return (
    <Animated.View style={[{ alignSelf: "flex-start", borderWidth: 1, borderColor: color, borderRadius: 9, padding: 3 }, animatedStyle, style]}>
      <View style={{ borderWidth: 2.5, borderColor: color, borderRadius: 6, paddingVertical: dims.py, paddingHorizontal: dims.px, alignItems: "center", rowGap: 3 }}>
        <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: dims.fs, lineHeight: dims.fs, letterSpacing: dims.fs * 0.14, textTransform: "uppercase", color }}>{children}</Text>
        {sub ? <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: dims.sub, letterSpacing: dims.sub * 0.2, textTransform: "uppercase", color, opacity: 0.75 }}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

/* SheetShell edge — a receipt torn off the roll (zig-zag). `color` is the sheet
   surface, so the teeth read as the paper's own torn edge. */
export function TearEdge({ flip = false, color }: { flip?: boolean; color?: string }) {
  const t = useZenoTokens();
  const teeth = color ?? t.color.surfaceCard;
  // A row of triangles, clipped to the width; up-pointing by default (torn top),
  // rotated 180° for a torn bottom. No width measurement needed.
  return (
    <View style={{ height: 9, flexDirection: "row", overflow: "hidden" }} pointerEvents="none">
      {Array.from({ length: 48 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderBottomWidth: 9,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: teeth,
            transform: flip ? [{ rotate: "180deg" }] : undefined
          }}
        />
      ))}
    </View>
  );
}

/* SkeletonRow — loading placeholder. A calm opacity pulse (no gradient lib
   needed, no layout measurement); reduced motion holds it static. */
export function SkeletonRow({ width = "100%", height = 14, style }: { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> }) {
  const t = useZenoTokens();
  const c = t.color;
  const reduced = useReducedMotion();
  const o = useSharedValue(0.6);
  useEffect(() => {
    if (reduced) {
      o.value = 0.7;
      return;
    }
    o.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 650, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: 4, backgroundColor: c.surfaceSunken }, animatedStyle, style]} />;
}

/* CodeBoxes — mono boxes for an N-char code (e.g. the Family Vault share code). */
export function CodeBoxes({ code = "", length = 8, size = 36 }: { code?: string; length?: number; size?: number }) {
  const t = useZenoTokens();
  const c = t.color;
  const chars = code.padEnd(length).slice(0, length).split("");
  return (
    <View style={{ flexDirection: "row", columnGap: 6, justifyContent: "center" }}>
      {chars.map((ch, i) => {
        const filled = ch.trim().length > 0;
        return (
          <View key={i} style={{ width: size, height: size + 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.ruleStrong, borderRadius: 6, backgroundColor: c.surfaceCard }}>
            <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: size * 0.48, color: filled ? c.textPrimary : c.textDisabled }}>{filled ? ch : "·"}</Text>
          </View>
        );
      })}
    </View>
  );
}
