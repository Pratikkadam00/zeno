import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";
import { palette } from "../../theme/zeno";
import { haptics } from "../../theme/haptics";

/**
 * Zeno Button — the ledger-language action primitive.
 * `primary` is SOLID INK on paper text. Green is reserved for money-positive
 * moments (`money`), never generic CTAs. `danger` is outlined — real alerts
 * only, never solid panic. Press = stamp-down (scale 0.97) + Medium haptic on
 * the solid CTAs. Ported from Zeno Design System/components/core/Button.jsx.
 */
export type ButtonVariant = "primary" | "money" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  onPress,
  children,
  style,
  accessibilityLabel
}: ButtonProps) {
  const t = useZenoTokens();
  const c = t.color;

  const sizes = {
    sm: { h: 36, px: 14, fs: t.fontSize.bodySm, gap: 6, radius: t.radius.sm },
    md: { h: 44, px: 18, fs: t.fontSize.body, gap: 8, radius: t.radius.md },
    lg: { h: 52, px: 24, fs: t.fontSize.bodyLg, gap: 10, radius: t.radius.md }
  } as const;
  const s = sizes[size];

  const variants: Record<ButtonVariant, { bg: string; pressed: string; color: string; border: string; shadow?: object }> = {
    // solid ink — the default action, reads as a stamped statement line
    primary: { bg: c.inkPanel, pressed: palette.ink[700], color: c.textOnInk, border: "transparent", shadow: t.shadow.xs },
    // the ONLY green button: money-positive actions (savings, verified cancels)
    money: { bg: c.accent, pressed: c.accentPressed, color: c.textOnAccent, border: "transparent", shadow: t.shadow.xs },
    secondary: { bg: c.surfaceCard, pressed: c.surfaceSunken, color: c.textPrimary, border: c.borderDefault },
    ghost: { bg: "transparent", pressed: c.surfaceSunken, color: c.textPrimary, border: "transparent" },
    // outlined, never solid — a destructive action shouldn't shout before it's chosen
    danger: { bg: c.surfaceCard, pressed: c.dangerSoft, color: c.danger, border: c.danger }
  };
  const v = variants[variant];
  const solid = variant === "primary" || variant === "money";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={
        onPress
          ? () => {
              // Solid CTAs land with weight; quieter variants stay silent.
              if (solid) {
                haptics.primaryAction();
              }
              onPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          columnGap: s.gap,
          height: s.h,
          paddingHorizontal: s.px,
          width: fullWidth ? "100%" : undefined,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          borderRadius: s.radius,
          borderWidth: 1,
          borderColor: disabled ? c.borderSubtle : v.border,
          backgroundColor: disabled ? c.surfaceSunken : pressed ? v.pressed : v.bg,
          // stamp-down: presses press INTO the page rather than bouncing off it
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }, { translateY: pressed && !disabled ? 0.5 : 0 }]
        },
        !disabled && solid ? v.shadow : null,
        style
      ]}
    >
      {leftIcon ? <View>{leftIcon}</View> : null}
      <Text
        numberOfLines={1}
        style={{
          fontFamily: t.fonts.sans.semibold,
          fontSize: s.fs,
          letterSpacing: t.letterSpacing.snug,
          color: disabled ? c.textDisabled : v.color
        }}
      >
        {children}
      </Text>
      {rightIcon ? <View>{rightIcon}</View> : null}
    </Pressable>
  );
}
