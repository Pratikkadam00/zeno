import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type IconButtonVariant = "ghost" | "secondary" | "primary";
export type IconButtonShape = "round" | "square";

export type IconButtonProps = {
  variant?: IconButtonVariant;
  size?: number;
  shape?: IconButtonShape;
  disabled?: boolean;
  label?: string;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  variant = "ghost",
  size = 40,
  shape = "round",
  disabled = false,
  label,
  onPress,
  children,
  style
}: IconButtonProps) {
  const t = useZenoTokens();
  const c = t.color;

  const variants: Record<IconButtonVariant, { bg: string; pressed: string; border: string }> = {
    ghost: { bg: "transparent", pressed: c.surfaceSunken, border: "transparent" },
    secondary: { bg: c.surfaceCard, pressed: c.surfaceSunken, border: c.borderDefault },
    primary: { bg: c.accent, pressed: c.accentPressed, border: "transparent" }
  };
  const v = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: shape === "round" ? t.radius.pill : t.radius.md,
          borderWidth: 1,
          borderColor: v.border,
          backgroundColor: disabled ? "transparent" : pressed ? v.pressed : v.bg,
          transform: [{ scale: pressed && !disabled ? 0.92 : 1 }]
        },
        style
      ]}
    >
      {children}
    </Pressable>
  );
}
