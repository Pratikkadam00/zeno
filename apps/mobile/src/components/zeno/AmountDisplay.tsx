import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type AmountDisplaySize = "sm" | "md" | "lg" | "xl";

export type AmountDisplayProps = {
  amount?: number;
  currency?: string;
  cadence?: string;
  size?: AmountDisplaySize;
  trend?: "up" | "down";
  trendValue?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Zeno AmountDisplay — the canonical money figure. Mono, tabular, with a smaller
 * currency mark and cents, optional cadence suffix and trend indicator.
 */
export function AmountDisplay({
  amount = 0,
  currency = "$",
  cadence,
  size = "lg",
  trend,
  trendValue,
  color,
  style
}: AmountDisplayProps) {
  const t = useZenoTokens();
  const c = t.color;
  const sizes: Record<AmountDisplaySize, number> = { sm: 20, md: 28, lg: 40, xl: 56 };
  const fs = sizes[size];
  const [whole, frac] = Number(amount).toFixed(2).split(".");
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
