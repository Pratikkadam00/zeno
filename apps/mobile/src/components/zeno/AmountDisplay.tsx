import { useEffect, useRef, useState } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";
import { useReducedMotion } from "../../theme/motion";

export type AmountDisplaySize = "sm" | "md" | "lg" | "xl";

export type AmountDisplayProps = {
  amount?: number;
  currency?: string;
  cadence?: string;
  size?: AmountDisplaySize;
  trend?: "up" | "down";
  trendValue?: string;
  color?: string;
  /** Adding-machine count-up for hero figures (the DS "TallyNumber" beat). */
  animate?: boolean;
  animateMs?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Zeno AmountDisplay — the canonical money figure. Mono, tabular, with a smaller
 * currency mark and cents, optional cadence suffix and trend indicator.
 * With `animate`, it counts up like an adding machine settling (the DS's
 * TallyNumber); reduced motion renders the final value immediately.
 */
/**
 * Counts from 0 up to `value` on a cubic ease-out. Returns `value` unchanged
 * when animation is off or motion is reduced. A failsafe timer forces the final
 * value shortly after the window: requestAnimationFrame can be throttled or
 * suspended entirely (backgrounded app, screen capture), and a ledger that sits
 * at $0.00 would be worse than no animation at all.
 */
function useCountUp(value: number, animate: boolean, durationMs: number): number {
  const reduced = useReducedMotion();
  const enabled = animate && !reduced;
  const [shown, setShown] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Nothing to drive when animation is off — the final value is returned
    // directly below, so no state sync (and no re-render) is needed here.
    if (!enabled) {
      return;
    }
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    const failsafe = setTimeout(() => setShown(value), durationMs + 300);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      clearTimeout(failsafe);
    };
  }, [value, enabled, durationMs]);

  return enabled ? shown : value;
}

export function AmountDisplay({
  amount = 0,
  currency = "$",
  cadence,
  size = "lg",
  trend,
  trendValue,
  color,
  animate = false,
  animateMs = 600,
  style
}: AmountDisplayProps) {
  const t = useZenoTokens();
  const c = t.color;
  const sizes: Record<AmountDisplaySize, number> = { sm: 20, md: 28, lg: 40, xl: 56 };
  const fs = sizes[size];
  const shown = useCountUp(amount, animate, animateMs);
  const [whole, frac] = Number(shown).toFixed(2).split(".");
  const main = color || c.textPrimary;
  const trendColor = trend === "up" ? c.danger : trend === "down" ? c.success : c.textTertiary;

  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", columnGap: 8 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Text
          style={{
            fontFamily: t.fonts.mono.semibold,
            fontSize: fs * 0.5,
            color: main,
            opacity: 0.7,
            marginTop: fs * 0.12
          }}
        >
          {currency}
        </Text>
        <Text
          style={{
            fontFamily: t.fonts.mono.bold,
            fontSize: fs,
            lineHeight: fs,
            letterSpacing: fs * t.letterSpacing.tight,
            color: main,
            fontVariant: ["tabular-nums"]
          }}
        >
          {whole}
        </Text>
        <Text style={{ fontFamily: t.fonts.mono.semibold, fontSize: fs * 0.5, color: main, opacity: 0.6, alignSelf: "flex-end" }}>
          .{frac}
        </Text>
      </View>
      {cadence ? (
        <Text style={{ fontFamily: t.fonts.sans.medium, fontSize: t.fontSize.bodySm, color: c.textTertiary }}>/{cadence}</Text>
      ) : null}
      {trend ? (
        <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.bodySm, color: trendColor }}>
          {trend === "up" ? "▲" : "▼"} {trendValue}
        </Text>
      ) : null}
    </View>
  );
}
