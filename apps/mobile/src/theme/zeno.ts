/* ============================================================
   Zeno — canonical design tokens for React Native.
   Ported 1:1 from the Zeno Design System (../../Zeno Design System/tokens/*.css).
   This is the SINGLE SOURCE OF TRUTH for color, type, spacing, radius,
   shadow, motion and fonts in the app. One brand, light + dark.
   Signature: The Honest Ledger — navy-cast INK on warm PAPER (#FAF9F5), bound
   by hairline RULES; Zeno Green #00C26E is reserved for money-positive accents
   (never white-on-green). Verified actions land a STAMP.
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
  // Ink neutrals are navy-cast (brand #0A0F2C heritage), not neutral grey.
  ink: {
    900: "#14161F", // primary text / near-black ink
    800: "#1C1F2B",
    700: "#2A2E3D",
    600: "#3C4152",
    500: "#5A6072", // secondary text
    400: "#808698", // tertiary text / icons
    300: "#A9AEBC", // strong border
    200: "#D2D5DE",
    100: "#E7E8EE", // divider
    75: "#EFF0F4",
    50: "#F3F3F1" // sunken surface (warm, paper-tinted)
  },
  paper: "#FAF9F5", // app background, warm paper
  white: "#FFFFFF",

  // Ledger signature tokens: hairline rules replace most card chrome; navy-ink
  // panels carry statement blocks; stamps mark verified/alert states.
  ledger: {
    rule: "#E5E3D9", // hairline — leader lines, row dividers
    ruleStrong: "#C9C7BA", // column rules, leader dots
    inkPanel: "#10131F", // navy-ink statement blocks
    stampVerified: "#0B8A54", // "cancelled/verified" stamp
    stampAlert: "#C63B49" // "still charging/alert" stamp
  },

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

  // Ledger signature tokens (art-directed per scheme).
  rule: string;
  ruleStrong: string;
  inkPanel: string;
  stampVerified: string;
  stampAlert: string;

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

  borderSubtle: palette.ledger.rule,
  borderDefault: palette.ledger.ruleStrong,
  borderStrong: palette.ink[300],

  rule: palette.ledger.rule,
  ruleStrong: palette.ledger.ruleStrong,
  inkPanel: palette.ledger.inkPanel,
  stampVerified: palette.ledger.stampVerified,
  stampAlert: palette.ledger.stampAlert,

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

// Dark = "the ledger at 11pm": the desk goes navy-black, paper becomes lit
// documents, green ink gains luminescence, rules glow faintly. Not an inversion.
export const darkScheme: ColorScheme = {
  bgApp: "#0A0C13", // the desk
  surfaceCard: "#141721", // lit paper
  surfaceSunken: "#10121B",
  surfaceRaised: "#1B1E2B",
  surfaceInverse: palette.paper,

  textPrimary: "#F2F1EA", // warm paper-white
  textSecondary: "#9BA0AF",
  textTertiary: "#6C7180",
  textDisabled: "#4B505E",
  textOnAccent: "#0A0C13",
  textInverse: "#14161F",

  borderSubtle: "#262A38",
  borderDefault: "#3A3F50",
  borderStrong: "#4A5064",

  rule: "#262A38",
  ruleStrong: "#3A3F50",
  inkPanel: "#171B2A",
  stampVerified: "#2FD98A",
  stampAlert: "#F2687A",

  accent: "#1ED47F", // luminous green ink
  accentHover: "#2FD98A",
  accentPressed: "#5FE0A6",
  accentSoft: "rgba(30, 212, 127, 0.13)",
  accentSoft2: "rgba(30, 212, 127, 0.22)",
  accentText: "#4ADE97",

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

/* ---- Motion — matches motion.css. "Everything settles like paper." ----
   Reanimated spring configs (settle/thunk/sheet) live in ./motion.ts. */
export const motion = {
  durInstant: 80,
  durFast: 140,
  dur: 220,
  durSlow: 340,
  printStagger: 45, // per-row print-in delay (FadeInDown stagger)
  // RN Easing.bezier(...) args
  easeOut: [0.22, 0.8, 0.26, 1] as const,
  easeInOut: [0.5, 0, 0.2, 1] as const,
  easeThunk: [0.34, 1.3, 0.5, 1] as const, // stamp lands with weight
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
