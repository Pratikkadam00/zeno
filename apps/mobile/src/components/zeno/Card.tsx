import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useZenoTokens } from "../../theme/useZenoTokens";

export type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = {
  padding?: CardPadding;
  interactive?: boolean;
  elevated?: boolean;
  onPress?: () => void;
  /** Required when interactive/onPress is set, so a tappable card always announces correctly. */
  accessibilityLabel?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Zeno Card — white surface, hairline border, soft resting shadow. */
export function Card({ padding = "md", interactive = false, elevated = false, onPress, accessibilityLabel, children, style }: CardProps) {
  const t = useZenoTokens();
  const c = t.color;
  const pads: Record<CardPadding, number> = { none: 0, sm: t.space[3], md: t.space[5], lg: t.space[6] };

  const base: StyleProp<ViewStyle> = {
    backgroundColor: c.surfaceCard,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: t.radius.lg,
    padding: pads[padding]
  };

  if (interactive || onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [base, pressed ? t.shadow.md : elevated ? t.shadow.sm : t.shadow.xs, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, elevated ? t.shadow.sm : t.shadow.xs, style]}>{children}</View>;
}
