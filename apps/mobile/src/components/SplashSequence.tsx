import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts } from "../theme/zeno";
import { useReducedMotion } from "../theme/motion";

/* ============================================================
   The launch splash — concept 1e "The Tear" (Honest Ledger, REFINED).
   The cover IS the app icon: the green Zeno coin stamps onto navy, a thumb
   grips (tug + resistance), then the sheet rips away with a slight twist,
   revealing a ruled ledger page whose lockup flutters awake as the edge
   passes; the green "ready" tick draws last. Transform + opacity only.

   Safety: onDone ALWAYS fires on a timer (independent of the animation), so a
   misbehaving spring can never leave the splash covering the app. Reduced
   motion skips the tear entirely and reveals the page immediately.
   ============================================================ */

const NAVY = "#0A0F2C"; // the cover (matches the native splash + adaptiveIcon bg)
const PAPER = "#FAF9F5"; // the ledger page beneath
const INK = "#14161F"; // page ink
const GREEN = "#1ED47F"; // the coin / tick
const TAG = "#808698";
const RULE = "rgba(20, 22, 31, 0.05)";
const RULE_GAP = 44;

// Total run time; onDone fires here regardless of animation state.
const RUN_MS = 2250;
const REDUCED_MS = 700;

function CoinMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Circle cx={60} cy={60} r={51} stroke={color} strokeWidth={5.5} />
      <Circle cx={60} cy={60} r={43} stroke={color} strokeWidth={2} />
      <Path d="M43 45 H77 L43 75 H77" stroke={color} strokeWidth={9.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SplashSequence({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  // Cover: the green coin stamps in, then the whole sheet tears away.
  const stampScale = useSharedValue(1.9);
  const stampOpacity = useSharedValue(0);
  const stampRot = useSharedValue(-6);
  const coverY = useSharedValue(0);
  const coverRot = useSharedValue(0);

  // Page lockup: each flutters in (opacity + rise) as the tear edge passes.
  const sealO = useSharedValue(0);
  const sealY = useSharedValue(8);
  const wordO = useSharedValue(0);
  const wordY = useSharedValue(8);
  const tagO = useSharedValue(0);
  const tagY = useSharedValue(8);
  const tickSX = useSharedValue(0);

  useEffect(() => {
    // onDone is the single source of truth for dismissal — never tied to a spring.
    const timer = setTimeout(onDone, reduced ? REDUCED_MS : RUN_MS);

    if (reduced) {
      // Reveal the page immediately; no cover, no tear.
      stampOpacity.value = 1;
      stampScale.value = 1;
      stampRot.value = 0;
      coverY.value = -(height * 1.3);
      sealO.value = 1; sealY.value = 0;
      wordO.value = 1; wordY.value = 0;
      tagO.value = 1; tagY.value = 0;
      tickSX.value = 1;
      return () => clearTimeout(timer);
    }

    const thunk = Easing.bezier(0.34, 1.3, 0.5, 1);
    const easeOut = Easing.bezier(0.22, 0.8, 0.26, 1);

    // 1 — the coin stamps onto the cover (heavy in, settle).
    stampOpacity.value = withDelay(220, withTiming(1, { duration: 150 }));
    stampScale.value = withDelay(220, withSequence(
      withTiming(0.95, { duration: 252, easing: thunk }),
      withTiming(1, { duration: 168 })
    ));
    stampRot.value = withDelay(220, withSequence(
      withTiming(-1, { duration: 252, easing: thunk }),
      withTiming(0, { duration: 168 })
    ));

    // 2 — grip (tug), resistance, then the rip.
    coverY.value = withDelay(850, withSequence(
      withTiming(-14, { duration: 168, easing: Easing.bezier(0.3, 0, 0.4, 1) }),
      withTiming(-6, { duration: 126, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      withTiming(-(height * 1.25), { duration: 756, easing: Easing.bezier(0.72, 0, 0.9, 0.4) })
    ));
    coverRot.value = withDelay(850, withSequence(
      withTiming(-0.5, { duration: 168 }),
      withTiming(-0.3, { duration: 126 }),
      withTiming(-4, { duration: 756 })
    ));

    // 3 — the page flutters awake as the edge passes each element.
    const flutter = (o: typeof tagO, y: typeof tagY, delay: number) => {
      o.value = withDelay(delay, withTiming(1, { duration: 260, easing: easeOut }));
      y.value = withDelay(delay, withTiming(0, { duration: 260, easing: easeOut }));
    };
    flutter(tagO, tagY, 1540);
    flutter(wordO, wordY, 1590);
    flutter(sealO, sealY, 1650);
    tickSX.value = withDelay(1860, withTiming(1, { duration: 300, easing: easeOut }));

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, height]);

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: coverY.value }, { rotate: `${coverRot.value}deg` }]
  }));
  const coinStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity.value,
    transform: [{ scale: stampScale.value }, { rotate: `${stampRot.value}deg` }]
  }));
  const sealStyle = useAnimatedStyle(() => ({ opacity: sealO.value, transform: [{ translateY: sealY.value }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: wordO.value, transform: [{ translateY: wordY.value }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagO.value, transform: [{ translateY: tagY.value }] }));
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: tickSX.value }] }));

  // Torn bottom edge of the cover: a row of navy diamonds straddling the seam.
  const teeth = Math.ceil(width / 16) + 2;

  return (
    // No pointerEvents="none" — the splash swallows touches to the app beneath it
    // while it plays.
    <View style={StyleSheet.absoluteFill}>
      {/* The ruled ledger page (revealed beneath the cover). */}
      <View style={styles.page}>
        {Array.from({ length: Math.ceil(height / RULE_GAP) }).map((_, i) => (
          <View key={i} style={[styles.rule, { top: i * RULE_GAP + RULE_GAP - 1 }]} />
        ))}
        <View style={styles.lockup}>
          <Animated.View style={sealStyle}>
            <CoinMark size={118} color={INK} />
          </Animated.View>
          <Animated.Text style={[styles.word, wordStyle]}>zeno</Animated.Text>
          <Animated.View style={[styles.tick, tickStyle]} />
          <Animated.Text style={[styles.tag, tagStyle]}>THE HONEST LEDGER</Animated.Text>
        </View>
      </View>

      {/* The cover — the app icon that rips away. */}
      <Animated.View style={[styles.cover, coverStyle]}>
        <Animated.View style={coinStyle}>
          <CoinMark size={120} color={GREEN} />
        </Animated.View>
        <View style={styles.tornEdge}>
          {Array.from({ length: teeth }).map((_, i) => (
            <View key={i} style={styles.tooth} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PAPER,
    alignItems: "center",
    justifyContent: "center"
  },
  rule: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: RULE },
  lockup: { alignItems: "center", gap: 22 },
  word: { fontFamily: fonts.display.bold, fontSize: 46, letterSpacing: -1.8, color: INK },
  tick: { width: 26, height: 3, backgroundColor: GREEN },
  tag: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 2.4, color: TAG },
  cover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center"
  },
  tornEdge: {
    position: "absolute",
    bottom: -7,
    left: 0,
    right: 0,
    height: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "hidden"
  },
  tooth: { width: 14, height: 14, backgroundColor: NAVY, transform: [{ rotate: "45deg" }] }
});
