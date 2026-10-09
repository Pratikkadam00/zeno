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
    // F233: the soft chip's text is the TEXT grade of the tone, which the
    // theme picks per scheme. It used to be the fill colour (2.79-3.18:1 on
    // its own chip in light), except warning, which was a hardcoded #B45309 —
    // right for paper, but 2.65:1 on the dark chip, where it was never read.
    success: { soft: c.successSoft, softText: c.successText, solid: c.success, dot: c.success },
    warning: { soft: c.warningSoft, softText: c.warningText, solid: c.warning, dot: c.warning },
    danger: { soft: c.dangerSoft, softText: c.dangerText, solid: c.danger, dot: c.danger },
    info: { soft: c.infoSoft, softText: c.infoText, solid: c.info, dot: c.info }
  };
  const tn = tones[tone];
  // F233: every solid chip but the neutral one carries INK. White was 3.10:1
  // on the green, 3.67 on the danger red and 3.68 on the info blue; ink is
  // 5.81, 4.91 and 4.90, and it is already what the brand asks for on green
  // ("never white-on-green") and what warning already used. The neutral chip
  // is the one dark fill (ink 700), so it keeps white: ink on it is 1.34:1.
  const textColor = solid ? (tone === "neutral" ? "#FFFFFF" : t.palette.ink[900]) : tn.softText;

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
