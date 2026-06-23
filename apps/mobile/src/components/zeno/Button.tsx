import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
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
    primary: { bg: c.accent, pressed: c.accentPressed, color: c.textOnAccent, border: "transparent", shadow: t.shadow.xs },
    secondary: { bg: c.surfaceCard, pressed: c.surfaceSunken, color: c.textPrimary, border: c.borderDefault, shadow: t.shadow.xs },
    ghost: { bg: "transparent", pressed: c.surfaceSunken, color: c.textPrimary, border: "transparent" },
    danger: { bg: c.danger, pressed: "#BE123C", color: "#FFFFFF", border: "transparent", shadow: t.shadow.xs }
  };
  const v = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
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
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }]
        },
        !disabled && variant !== "ghost" ? v.shadow : null,
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
