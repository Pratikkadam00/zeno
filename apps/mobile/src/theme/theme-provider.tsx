import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemePreference } from "@zeno/shared";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";
import { zenoDark, zenoLight, type ThemeTokens } from "./tokens";

const themeStorageKey = "zeno.theme.preference.v2";
const schemeStorageKey = "zeno.color.scheme.v1";

export type ColorSchemeName = "light" | "dark";

type ThemeContextValue = {
  /** Legacy preference id — retained for back-compat; no longer changes the look. */
  themeId: ThemePreference;
  /** Active Zeno brand tokens for the current color scheme. */
  theme: ThemeTokens;
  /** Light or dark. */
  scheme: ColorSchemeName;
  setThemeId: (theme: ThemePreference) => void;
  setScheme: (scheme: ColorSchemeName) => void;
  toggleScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const legacyThemeMap: Record<string, ThemePreference> = {
  clarity: "millennial",
  pulse: "genz",
  command: "genx"
};

function normalizeThemePreference(value: string | null): ThemePreference | null {
  if (value === "genz" || value === "millennial" || value === "genx") {
    return value;
  }
  return value ? legacyThemeMap[value] ?? null : null;
}

export function ZenoThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemePreference>("millennial");
  const [scheme, setSchemeState] = useState<ColorSchemeName>("light");
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    void AsyncStorage.getItem(themeStorageKey)
      .then((stored) => {
        const normalized = normalizeThemePreference(stored);
        if (normalized) {
          setThemeIdState(normalized);
          if (stored !== normalized) {
            void AsyncStorage.setItem(themeStorageKey, normalized);
          }
        }
      })
      .catch(() => {
        setThemeIdState("millennial");
      });

    void AsyncStorage.getItem(schemeStorageKey)
      .then((stored) => {
        if (stored === "light" || stored === "dark") {
          setSchemeState(stored);
        }
      })
      .catch(() => {
        setSchemeState("light");
      });
  }, []);

  useEffect(() => {
    fade.setValue(0.72);
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [fade, scheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = scheme === "dark" ? zenoDark : zenoLight;
    return {
      themeId,
      theme,
      scheme,
      setThemeId(nextTheme) {
        // Retained for back-compat; the look no longer changes per preference.
        setThemeIdState(nextTheme);
        void AsyncStorage.setItem(themeStorageKey, nextTheme);
      },
      setScheme(nextScheme) {
        setSchemeState(nextScheme);
        void AsyncStorage.setItem(schemeStorageKey, nextScheme);
      },
      toggleScheme() {
        const next: ColorSchemeName = scheme === "dark" ? "light" : "dark";
        setSchemeState(next);
        void AsyncStorage.setItem(schemeStorageKey, next);
      }
    };
  }, [themeId, scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <Animated.View style={[styles.provider, { opacity: fade }]}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  );
}

export function useZenoTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useZenoTheme must be used inside ZenoThemeProvider");
  }
  return value;
}

const styles = StyleSheet.create({
  provider: {
    flex: 1
  }
});
