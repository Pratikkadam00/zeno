import { FileSpreadsheet, MailSearch, PencilLine } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { springs } from "../../theme/motion";
import { fonts } from "../../theme/zeno";
import { useZenoTokens } from "../../theme/useZenoTokens";

/*
 * The quick-pick arc behind the tab bar's ⊕ (F244). Ported from
 * Zeno Design System/ui_kits/app/Chrome.jsx, QUICK_ACTIONS and the TabBar
 * comment there:
 *
 *   "Quick-pick arc for the ⊕ long-press — three seals fanned within thumb
 *    sweep. Top = recommended. tx/ty are offsets from the FAB center."
 *   "HOLD ⊕ (300ms) fans three seals in an arc above the thumb while the page
 *    behind blurs: sweep onto one, release to pick. Release anywhere else
 *    cancels. The plus rotates 45° while open. MOTION: seals pop out along
 *    their vectors (0.24s thunk ease, 40ms stagger; RN: withSpring per seal),
 *    scrim fades in 180ms; hot seal inks green + scales 1.12 in 110ms.
 *    Reduced motion → seals appear in place, scrim opacity only."
 *
 * This file is the drawing and the geometry only; the gesture lives with the
 * button in app/(tabs)/_layout.tsx. The geometry is exported so the gesture's
 * hit-test and the tests read the same numbers the seals are drawn from.
 *
 * One deviation from the spec, on purpose: the scrim is a translucent wash,
 * not a blur. expo-blur is not a dependency, and on Android its blur is
 * partial and costly; the DS readme already limits blur to the tab bar.
 */

export type QuickActionId = "manual" | "csv" | "email";

export type QuickAction = {
  id: QuickActionId;
  label: string;
  /** Offset of the seal's centre from the ⊕ centre, in dp (Chrome.jsx tx/ty). */
  tx: number;
  ty: number;
};

/** Left, top (recommended), right. The order is the pop stagger order. */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: "manual", label: "ADD BY HAND", tx: -96, ty: -94 },
  { id: "csv", label: "IMPORT CSV", tx: 0, ty: -134 },
  { id: "email", label: "SCAN EMAIL", tx: 96, ty: -94 }
];

export const SEAL_SIZE = 56;
/** Chrome.jsx hit-tests the seal's box plus 6dp sideways and 5dp vertically. */
const HIT_SLOP_X = 6;
const HIT_SLOP_Y = 5;
/** The label sits under the seal; the hit box in Chrome.jsx covers both. */
const LABEL_HEIGHT = 22;

/**
 * Which seal a finger is over, given its offset from the ⊕ centre. Pure, so
 * the gesture and the tests agree on exactly one answer.
 */
export function hitTest(dx: number, dy: number): QuickActionId | null {
  for (const action of QUICK_ACTIONS) {
    const left = action.tx - SEAL_SIZE / 2 - HIT_SLOP_X;
    const right = action.tx + SEAL_SIZE / 2 + HIT_SLOP_X;
    const top = action.ty - SEAL_SIZE / 2 - HIT_SLOP_Y;
    const bottom = action.ty + SEAL_SIZE / 2 + LABEL_HEIGHT + HIT_SLOP_Y;
    if (dx >= left && dx <= right && dy >= top && dy <= bottom) return action.id;
  }
  return null;
}

const ICONS = { manual: PencilLine, csv: FileSpreadsheet, email: MailSearch } as const;

function Seal({ action, index, open, hot, reduced }: { action: QuickAction; index: number; open: boolean; hot: boolean; reduced: boolean }) {
  const t = useZenoTokens();
  const c = t.color;
  const out = useSharedValue(0); // 0 = at the ⊕, 1 = at its place on the arc
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      out.value = open ? 1 : 0;
    } else if (open) {
      // "seals pop out along their vectors (0.24s thunk ease, 40ms stagger)"
      out.value = withDelay(index * 40, withSpring(1, springs.thunk));
    } else {
      out.value = withTiming(0, { duration: 140 });
    }
  }, [open, reduced, index, out]);

  useEffect(() => {
    // "hot seal inks green + scales 1.12 in 110ms"
    scale.value = reduced ? (hot ? 1.12 : 1) : withTiming(hot ? 1.12 : 1, { duration: 110 });
  }, [hot, reduced, scale]);

  const travel = useAnimatedStyle(() => ({
    opacity: out.value,
    transform: [{ translateX: action.tx * out.value }, { translateY: action.ty * out.value }, { scale: scale.value }]
  }));

  const Icon = ICONS[action.id];
  return (
    <Animated.View
      pointerEvents="none"
      accessible={open}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityState={{ selected: hot }}
      testID={`quick-${action.id}`}
      style={[styles.seal, travel]}
    >
      <View
        style={[
          styles.disc,
          t.shadow.md,
          { backgroundColor: hot ? c.accent : c.inkPanel, borderColor: hot ? c.accent : c.ruleStrong }
        ]}
      >
        <Icon size={22} color={hot ? c.inkPanel : c.accent} strokeWidth={2.2} />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: hot ? c.textOnInk : c.textPrimary, backgroundColor: hot ? c.inkPanel : c.surfaceCard, borderColor: c.rule }
        ]}
      >
        {action.label}
      </Text>
    </Animated.View>
  );
}

export type QuickAddArcProps = {
  open: boolean;
  hot: QuickActionId | null;
  reduced: boolean;
  /** Where the ⊕ centre is within the parent, so the seals fan from it. */
  origin: { x: number; y: number };
  style?: ViewStyle;
};

/** The scrim and the three seals, drawn around the ⊕ centre. */
export function QuickAddArc({ open, hot, reduced, origin, style }: QuickAddArcProps) {
  const t = useZenoTokens();
  const scrim = useSharedValue(0);

  useEffect(() => {
    // "scrim fades in 180ms"; under reduced motion it is the only thing that moves.
    scrim.value = withTiming(open ? 1 : 0, { duration: open ? 180 : 140 });
  }, [open, scrim]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} testID="quick-add-arc" accessibilityElementsHidden={!open}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.color.overlay }, scrimStyle]} />
      <View style={{ position: "absolute", left: origin.x, top: origin.y, width: 0, height: 0 }}>
        {QUICK_ACTIONS.map((action, index) => (
          <Seal key={action.id} action={action} index={index} open={open} hot={hot === action.id} reduced={reduced} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Wide enough for the longest label ("ADD BY HAND") on one line, centred on
  // the seal: the label is a caption under a 56dp disc, not a second disc.
  seal: { position: "absolute", left: -SEAL_SIZE / 2 - 32, top: -SEAL_SIZE / 2, width: SEAL_SIZE + 64, alignItems: "center", gap: 6 },
  disc: { width: SEAL_SIZE, height: SEAL_SIZE, borderRadius: SEAL_SIZE / 2, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  label: {
    fontFamily: fonts.mono.bold,
    fontSize: 8,
    letterSpacing: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
    overflow: "hidden"
  }
});
