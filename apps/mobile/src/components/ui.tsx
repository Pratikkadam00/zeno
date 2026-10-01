import { StyleSheet, View, type ViewProps } from "react-native";
import { useZenoTheme } from "../theme/theme-provider";

// P3.8b: TextLink, ThemeToggle (the retired generational themes) and Kpi were
// removed: nothing imported them (source search), so they were dead code.
// P3.8f-2: PrimaryButton too, once ComingSoon's fake waitlist button went (F153).

export function Screen({ children, style }: ViewProps) {
  const { theme } = useZenoTheme();
  return <View style={[styles.screen, { backgroundColor: theme.background }, style]}>{children}</View>;
}

/**
 * Legacy surface, restyled to the Honest Ledger: a document on paper — hairline
 * `rule` frame, radius md, and NO resting shadow (a card is not a floating
 * tile). Screens still importing this pick up the ledger look without needing a
 * structural rewrite; they migrate to the zeno kit screen by screen.
 */
export function Surface({ children, style }: ViewProps) {
  const { theme } = useZenoTheme();
  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: theme.card,
          borderColor: theme.rule,
          borderRadius: 12
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 16
  },
  surface: {
    borderWidth: 1,
    padding: 16
  }
});
