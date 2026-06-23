import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export type BadgeProps = {
  tone?: BadgeTone;
  solid?: boolean;
  dot?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Zeno Badge — compact status / metadata pill. Soft by default, solid for emphasis. */
export function Badge({ tone = "neutral", solid = false, dot = false, children, style }: BadgeProps) {
  const t = useZenoTokens();
  const c = t.color;

  const tones: Record<BadgeTone, { soft: string; softText: string; solid: string; dot: string }> = {
    neutral: { soft: c.surfaceSunken, softText: c.textSecondary, solid: t.palette.ink[700], dot: t.palette.ink[400] },
    accent: { soft: c.accentSoft, softText: c.accentText, solid: c.accent, dot: c.accent },
    success: { soft: c.successSoft, softText: c.success, solid: c.success, dot: c.success },
    warning: { soft: c.warningSoft, softText: "#B45309", solid: c.warning, dot: c.warning },
    danger: { soft: c.dangerSoft, softText: c.danger, solid: c.danger, dot: c.danger },
    info: { soft: c.infoSoft, softText: c.info, solid: c.info, dot: c.info }
  };
  const tn = tones[tone];
  const isSolidGreen = solid && tone === "accent";
  const textColor = solid ? (tone === "warning" || isSolidGreen ? t.palette.ink[900] : "#FFFFFF") : tn.softText;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          columnGap: 5,
          height: 22,
          paddingHorizontal: 9,
          borderRadius: t.radius.pill,
          backgroundColor: solid ? tn.solid : tn.soft
        },
        style
      ]}
    >
      {dot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: solid ? textColor : tn.dot }} />
      ) : null}
      <Text
        style={{
          fontFamily: t.fonts.sans.semibold,
          fontSize: t.fontSize.micro,
          letterSpacing: t.letterSpacing.snug,
          color: textColor
        }}
      >
        {children}
      </Text>
    </View>
  );
}
