/* ============================================================
   Zeno — canonical design tokens for React Native.
   Ported 1:1 from the Zeno Design System (../../Zeno Design System/tokens/*.css).
   This is the SINGLE SOURCE OF TRUTH for color, type, spacing, radius,
   shadow, motion and fonts in the app. One brand, light + dark.
   Signature: Zeno Green #00C26E with DARK INK text (never white-on-green).
   ============================================================ */

/* ---- Raw palette (matches tokens/colors.css :root) ---- */
export const palette = {
  green: {
    50: "#E6FBF1",
    100: "#C4F5DD",
    200: "#93ECC2",
    300: "#5FE0A6",
    400: "#2BD089",
    500: "#00C26E", // primary accent
    600: "#02A85F",
    700: "#057A46",
    800: "#0A5634",
    900: "#073A24"
  },
  ink: {
    900: "#12151B", // primary text / near-black
    800: "#1B1F27",
    700: "#2A2F3A",
    600: "#3C4250",
    500: "#5A6172", // secondary text
    400: "#818897", // tertiary text / icons
    300: "#AAB0BC",
    200: "#D3D7DF", // strong border
    100: "#E7E9EE", // default border / divider
    75: "#EFF1F4",
    50: "#F4F5F7" // sunken surface
  },
  paper: "#F8F8F6", // app background, warm white
  white: "#FFFFFF",

  /* Category palette — maps to subscription categories + charts */
  category: {
    green: "#00C26E",
    blue: "#3B82F6",
    violet: "#7C5CFC",
    amber: "#F5A524",
    coral: "#FB5E78",
    teal: "#14B8C4",
    pink: "#EC6FD6",
    slate: "#64748B"
  },

  /* Semantic raw */
  semantic: {
    success: "#02A85F",
    warning: "#F5A524",
    danger: "#F43F5E",
    info: "#3B82F6"
  }
} as const;

/* Ordered category list for charts / deterministic color assignment */
export const categoryOrder = [
  "violet",
  "blue",
  "coral",
  "amber",
  "teal",
  "green",
  "pink",
  "slate"
] as const;
export type CategoryColor = (typeof categoryOrder)[number];

/* ---- Semantic color schemes (matches the aliases in colors.css) ---- */
export type ColorScheme = {
  bgApp: string;
  surfaceCard: string;
  surfaceSunken: string;
  surfaceRaised: string;
  surfaceInverse: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textOnAccent: string; // dark ink on green = the Zeno look
  textInverse: string;

  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;

  accent: string;
  accentHover: string;
  accentPressed: string;
  accentSoft: string;
  accentSoft2: string;
  accentText: string;

  success: string;
  warning: string;
  danger: string;
  info: string;
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
  infoSoft: string;

  focusRing: string;
  overlay: string;
};

export const lightScheme: ColorScheme = {
  bgApp: palette.paper,
  surfaceCard: palette.white,
  surfaceSunken: palette.ink[50],
  surfaceRaised: palette.white,
  surfaceInverse: palette.ink[900],

  textPrimary: palette.ink[900],
  textSecondary: palette.ink[500],
  textTertiary: palette.ink[400],
  textDisabled: palette.ink[300],
  textOnAccent: palette.ink[900],
  textInverse: palette.white,

  borderSubtle: palette.ink[100],
  borderDefault: palette.ink[200],
  borderStrong: palette.ink[300],

  accent: palette.green[500],
  accentHover: palette.green[600],
  accentPressed: palette.green[700],
  accentSoft: palette.green[50],
  accentSoft2: palette.green[100],
  accentText: palette.green[700],

  success: palette.semantic.success,
  warning: palette.semantic.warning,
  danger: palette.semantic.danger,
  info: palette.semantic.info,
  successSoft: "#E6F7EE",
  warningSoft: "#FEF3DD",
  dangerSoft: "#FDE6EB",
  infoSoft: "#E6EFFE",

  focusRing: "rgba(0, 194, 110, 0.35)",
  overlay: "rgba(18, 21, 27, 0.55)"
};

export const darkScheme: ColorScheme = {
  bgApp: "#0B0D11",
  surfaceCard: "#15181F",
  surfaceSunken: "#101319",
  surfaceRaised: "#1B1F27",
  surfaceInverse: palette.paper,

  textPrimary: "#F2F3F6",
  textSecondary: "#9AA1AF",
  textTertiary: "#6B7280",
  textDisabled: "#4B515E",
  textOnAccent: "#0B0D11",
  textInverse: "#12151B",

  borderSubtle: "#232831",
  borderDefault: "#2E343F",
  borderStrong: "#3C4350",

  accent: "#14D17E",
  accentHover: "#2BD089",
  accentPressed: "#5FE0A6",
  accentSoft: "rgba(0, 194, 110, 0.14)",
  accentSoft2: "rgba(0, 194, 110, 0.22)",
  accentText: "#5FE0A6",

  success: palette.semantic.success,
  warning: palette.semantic.warning,
  danger: palette.semantic.danger,
  info: palette.semantic.info,
  successSoft: "rgba(2, 168, 95, 0.16)",
  warningSoft: "rgba(245, 165, 36, 0.16)",
  dangerSoft: "rgba(244, 63, 94, 0.16)",
  infoSoft: "rgba(59, 130, 246, 0.16)",

  focusRing: "rgba(20, 209, 126, 0.40)",
  overlay: "rgba(0, 0, 0, 0.6)"
};

/* ---- Spacing (4px base) + layout — matches spacing.css ---- */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80
} as const;

export const layout = {
  gutter: 16, // mobile screen padding
  gutterLg: 24,
  tapMin: 44, // iOS minimum hit target
  navHeight: 64,
  tabbarHeight: 84
} as const;

/* ---- Radius — matches radius.css ---- */
export const radius = {
  xs: 6,
  sm: 8,
  md: 12, // buttons, inputs
  lg: 16, // cards
  xl: 20,
  "2xl": 28, // large surfaces / sheets
  pill: 999,
  full: 9999
} as const;

/* ---- Font families ----
   Loaded via @expo-google-fonts/* (see fonts.ts). The string values match the
   module export names from those packages so a loaded font resolves directly. */
export const fonts = {
  display: {
    medium: "SpaceGrotesk_500Medium",
    semibold: "SpaceGrotesk_600SemiBold",
    bold: "SpaceGrotesk_700Bold"
  },
  sans: {
    regular: "HankenGrotesk_400Regular",
    medium: "HankenGrotesk_500Medium",
    semibold: "HankenGrotesk_600SemiBold",
    bold: "HankenGrotesk_700Bold",
    extra: "HankenGrotesk_800ExtraBold"
  },
  mono: {
    regular: "JetBrainsMono_400Regular",
    medium: "JetBrainsMono_500Medium",
    semibold: "JetBrainsMono_600SemiBold",
    bold: "JetBrainsMono_700Bold"
  }
} as const;

/* ---- Type scale — matches typography.css ---- */
export const fontSize = {
  displayXl: 48,
  displayLg: 36,
  displayMd: 28,
  titleLg: 22,
  title: 18,
  bodyLg: 16,
  body: 15,
  bodySm: 13,
  caption: 12,
  micro: 11
} as const;

export const lineHeight = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.45,
  relaxed: 1.6
} as const;

export const letterSpacing = {
  tight: -0.02,
  snug: -0.01,
  normal: 0,
  wide: 0.04,
  caps: 0.08
} as const;

/* ---- Shadows (RN) — derived from shadows.css.
   RN needs shadowColor/Offset/Opacity/Radius (+ elevation on Android). ---- */
export const shadow = {
  xs: {
    shadowColor: "#10141E",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  sm: {
    shadowColor: "#10141E",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  md: {
    shadowColor: "#10141E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6
  },
  lg: {
    shadowColor: "#10141E",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 12
  },
  accent: {
    shadowColor: palette.green[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 8
  }
} as const;

/* ---- Motion — matches motion.css ---- */
export const motion = {
  durInstant: 80,
  durFast: 140,
  dur: 220,
  durSlow: 340,
  // RN Easing.bezier(...) args
  easeOut: [0.22, 0.8, 0.26, 1] as const,
  easeInOut: [0.5, 0, 0.2, 1] as const,
  easeSpring: [0.34, 1.56, 0.64, 1] as const
} as const;

/* Convenience: full token bundle for a given scheme */
export function zenoTokens(scheme: "light" | "dark" = "light") {
  return {
    scheme,
    color: scheme === "dark" ? darkScheme : lightScheme,
    palette,
    space,
    layout,
    radius,
    fonts,
    fontSize,
    lineHeight,
    letterSpacing,
    shadow,
    motion
  };
}

export type ZenoTokens = ReturnType<typeof zenoTokens>;
