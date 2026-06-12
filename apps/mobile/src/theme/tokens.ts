import type { ThemePreference } from "@subradar/shared";

export type ThemeTokens = {
  id: ThemePreference;
  name: string;
  generation: string;
  icon: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  text: string;
  onPrimary: string;
  mutedText: string;
  quietText: string;
  border: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  radius: number;
  cardRadius: number;
  compact: boolean;
  shadows: boolean;
  heavyText: boolean;
  monospaceNumbers: boolean;
  numberFontFamily?: string;
};

export const themes: Record<ThemePreference, ThemeTokens> = {
  genz: {
    id: "genz",
    name: "Pulse",
    generation: "Gen Z",
    icon: "⚡",
    background: "#09090B",
    surface: "rgba(255,255,255,0.05)",
    surfaceAlt: "rgba(124,58,237,0.18)",
    card: "rgba(255,255,255,0.05)",
    text: "#FAFAFA",
    onPrimary: "#FFFFFF",
    mutedText: "#A1A1AA",
    quietText: "#71717A",
    border: "rgba(255,255,255,0.12)",
    primary: "#7C3AED",
    secondary: "#F43F5E",
    success: "#84CC16",
    warning: "#F59E0B",
    danger: "#EF4444",
    radius: 20,
    cardRadius: 20,
    compact: false,
    shadows: false,
    heavyText: true,
    monospaceNumbers: false
  },
  millennial: {
    id: "millennial",
    name: "Clarity",
    generation: "Millennial",
    icon: "◈",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceAlt: "#EAF3FF",
    card: "#FFFFFF",
    text: "#0F172A",
    onPrimary: "#FFFFFF",
    mutedText: "#64748B",
    quietText: "#94A3B8",
    border: "#D9E2EC",
    primary: "#2563EB",
    secondary: "#0D9488",
    success: "#15803D",
    warning: "#F59E0B",
    danger: "#EF4444",
    radius: 12,
    cardRadius: 12,
    compact: false,
    shadows: true,
    heavyText: false,
    monospaceNumbers: false
  },
  genx: {
    id: "genx",
    name: "Command",
    generation: "Gen X",
    icon: ">",
    background: "#0F172A",
    surface: "#1E293B",
    surfaceAlt: "#263449",
    card: "#1E293B",
    text: "#F8FAFC",
    onPrimary: "#FFFFFF",
    mutedText: "#94A3B8",
    quietText: "#64748B",
    border: "#334155",
    primary: "#15803D",
    secondary: "#D97706",
    success: "#22C55E",
    warning: "#D97706",
    danger: "#EF4444",
    radius: 4,
    cardRadius: 4,
    compact: true,
    shadows: false,
    heavyText: false,
    monospaceNumbers: true,
    numberFontFamily: "monospace"
  }
};

export const themeOrder: ThemePreference[] = ["genz", "millennial", "genx"];
