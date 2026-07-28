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

/**
 * Zeno Card — a document, not a floating tile. A hairline rule frame on paper
 * with NO resting shadow; only `elevated` (menus, floating surfaces) lifts off
 * the page. Apply the delete-a-card test: use it only when the content really
 * IS a distinct document (a statement, a receipt, a grouped ledger).
 * Ported from Zeno Design System/components/core/Card.jsx.
 */
export function Card({ padding = "md", interactive = false, elevated = false, onPress, accessibilityLabel, children, style }: CardProps) {
  const t = useZenoTokens();
  const c = t.color;
  const pads: Record<CardPadding, number> = { none: 0, sm: t.space[3], md: t.space[5], lg: t.space[6] };

  const base: StyleProp<ViewStyle> = {
    backgroundColor: c.surfaceCard,
    borderWidth: 1,
    borderColor: c.rule, // hairline — the frame IS the chrome
    borderRadius: t.radius.md,
    padding: pads[padding]
  };

  if (interactive || onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        // Pressing darkens the rule (the RN stand-in for the web's hover
        // border-shift) instead of raising a shadow — paper doesn't float.
        style={({ pressed }) => [base, pressed ? { borderColor: c.ruleStrong } : null, elevated ? t.shadow.sm : null, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, elevated ? t.shadow.sm : null, style]}>{children}</View>;
}
