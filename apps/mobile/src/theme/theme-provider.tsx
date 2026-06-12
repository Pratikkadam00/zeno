import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemePreference } from "@subradar/shared";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";
import { themes, type ThemeTokens } from "./tokens";

const themeStorageKey = "zeno.theme.preference.v2";

type ThemeContextValue = {
  themeId: ThemePreference;
  theme: ThemeTokens;
  setThemeId: (theme: ThemePreference) => void;
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

export function SubRadarThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemePreference>("millennial");
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
  }, []);

  useEffect(() => {
    fade.setValue(0.72);
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [fade, themeId]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeId,
    theme: themes[themeId],
    setThemeId(nextTheme) {
      setThemeIdState(nextTheme);
      void AsyncStorage.setItem(themeStorageKey, nextTheme);
    }
  }), [themeId]);

  return (
    <ThemeContext.Provider value={value}>
      <Animated.View style={[styles.provider, { opacity: fade }]}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  );
}

export function useSubRadarTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useSubRadarTheme must be used inside SubRadarThemeProvider");
  }
  return value;
}

export const useZenoTheme = useSubRadarTheme;

const styles = StyleSheet.create({
  provider: {
    flex: 1
  }
});
