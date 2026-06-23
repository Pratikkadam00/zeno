import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type ProgressBarProps = {
  value?: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Zeno ProgressBar — budget / usage meter. Auto-warns as it fills:
 * green under 75%, amber 75–99%, red at/over 100% (unless `color` is set).
 */
export function ProgressBar({ value = 0, max = 100, color, height = 8, showLabel = false, label, style }: ProgressBarProps) {
  const t = useZenoTokens();
  const c = t.color;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const autoColor = pct >= 100 ? c.danger : pct >= 75 ? c.warning : c.accent;
  const fill = color || autoColor;

  return (
    <View style={[{ rowGap: 6 }, style]}>
      {showLabel ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: t.fonts.sans.medium, fontSize: t.fontSize.caption, color: c.textSecondary }}>{label}</Text>
          <Text style={{ fontFamily: t.fonts.mono.semibold, fontSize: t.fontSize.caption, color: c.textSecondary }}>
            {Math.round(pct)}%
          </Text>
        </View>
      ) : null}
      <View style={{ width: "100%", height, backgroundColor: c.surfaceSunken, borderRadius: t.radius.pill, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: fill, borderRadius: t.radius.pill }} />
      </View>
    </View>
  );
}
