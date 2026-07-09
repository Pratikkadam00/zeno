import type { ThemePreference } from "@zeno/shared";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { themeOrder } from "../theme/tokens";
import { useZenoTheme } from "../theme/theme-provider";

const themeLabels: Record<ThemePreference, { icon: string; label: string }> = {
  genz: { icon: "⚡", label: "Pulse" },
  millennial: { icon: "◈", label: "Clarity" },
  genx: { icon: ">", label: "Command" }
};

export function Screen({ children, style }: ViewProps) {
  const { theme } = useZenoTheme();
  return <View style={[styles.screen, { backgroundColor: theme.background }, style]}>{children}</View>;
}

export function Surface({ children, style }: ViewProps) {
  const { theme } = useZenoTheme();
  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderRadius: theme.cardRadius
        },
        theme.shadows && styles.shadow,
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
    <Pressable accessibilityRole="button" {...props} style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, borderRadius: theme.radius, opacity: pressed ? 0.86 : 1 }, style]}>
      <Text style={[styles.buttonText, { color: theme.onPrimary, fontWeight: theme.heavyText ? "900" : "800" }]}>{children}</Text>
    </Pressable>
  );
}

export function TextLink({ href, children }: { href: string; children: string }) {
  const { theme } = useZenoTheme();
  return (
    <Link href={href as never} asChild>
      <Pressable accessibilityRole="link">
        <Text style={[styles.link, { color: theme.primary }]}>{children}</Text>
      </Pressable>
    </Link>
  );
}

export function ThemeToggle() {
  const { theme, themeId, setThemeId } = useZenoTheme();
  // useState (not useRef): reading a ref's .current during render is unsafe
  // under the React Compiler; Animated.Value mutates via its own setValue()
  // outside React's render cycle regardless, so this is a drop-in swap.
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    fade.setValue(0.72);
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [fade, themeId]);

  return (
    <Animated.View
      style={[
        styles.themeToggle,
        {
          opacity: fade,
          borderColor: theme.border,
          backgroundColor: theme.card,
          borderRadius: theme.radius
        },
        theme.shadows && styles.shadow
      ]}
    >
      {themeOrder.map((id) => {
        const active = id === themeId;
        const item = themeLabels[id];

        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => setThemeId(id)}
            style={({ pressed }) => [
              styles.themeToggleButton,
              {
                backgroundColor: active ? theme.primary : "transparent",
                borderRadius: Math.max(4, theme.radius - 2),
                opacity: pressed ? 0.78 : 1
              }
            ]}
          >
            <Text style={[styles.themeToggleText, { color: active ? theme.onPrimary : theme.mutedText }]}>
              {item.icon} {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

export function Kpi({ label, value }: { label: string; value: string }) {
  const { theme } = useZenoTheme();
  return (
    <Surface style={styles.kpi}>
      <Text style={[styles.kpiValue, { color: theme.text, fontFamily: theme.numberFontFamily }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.mutedText }]}>{label}</Text>
    </Surface>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 16
  },
  surface: {
    borderWidth: 1,
    padding: 16
  },
  shadow: {
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  buttonText: {
    fontSize: 16
  },
  themeToggle: {
    width: "100%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    padding: 4,
    gap: 4
  },
  themeToggleButton: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: "900"
  },
  link: {
    fontSize: 15,
    fontWeight: "700"
  },
  kpi: {
    flex: 1,
    minHeight: 88,
    justifyContent: "center"
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "800"
  },
  kpiLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600"
  }
});
