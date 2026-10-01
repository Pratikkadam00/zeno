import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { useZenoTheme } from "../theme/theme-provider";

// P3.8b: TextLink, ThemeToggle (the retired generational themes) and Kpi were
// removed: nothing imported them (source search), so they were dead code.

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

export function PrimaryButton({ children, style, ...props }: Omit<PressableProps, "children" | "style"> & { children: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useZenoTheme();
  return (
    <Pressable accessibilityRole="button" {...props} style={({ pressed }) => [styles.button, { backgroundColor: theme.inkPanel, borderRadius: theme.radius, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      <Text style={[styles.buttonText, { color: theme.onInk, fontWeight: theme.heavyText ? "900" : "800" }]}>{children}</Text>
    </Pressable>
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
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  buttonText: {
    fontSize: 16
  }
});
