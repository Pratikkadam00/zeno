import type { ThemePreference } from "@zeno/shared";
import { darkScheme, fonts, lightScheme, palette, radius, type ColorScheme } from "./zeno";

/* ============================================================
   Single Zeno brand behind the legacy ThemeTokens interface.
   The three generational modes (Pulse/Clarity/Command) are RETIRED — every
   ThemePreference now resolves to the one Zeno brand so existing screens adopt
   the design system with no edits. Light + dark are the only real variants.
   Source of truth for values: ./zeno.ts (ported from the Zeno Design System).
   ============================================================ */

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
  // Ledger signature tokens (hairline rules, navy-ink panels, stamps).
  rule: string;
  ruleStrong: string;
  inkPanel: string;
  stampVerified: string;
  stampAlert: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  primarySurface: string;
  successSurface: string;
  warningSurface: string;
  dangerSurface: string;
  overlay: string;
  radius: number;
  cardRadius: number;
  compact: boolean;
  shadows: boolean;
  heavyText: boolean;
  monospaceNumbers: boolean;
  numberFontFamily?: string;
};

function buildZenoTheme(id: ThemePreference, c: ColorScheme): ThemeTokens {
  return {
    id,
    name: "Zeno",
    generation: "",
    icon: "",
    background: c.bgApp,
    surface: c.surfaceCard,
    surfaceAlt: c.surfaceSunken,
    card: c.surfaceCard,
    text: c.textPrimary,
    onPrimary: c.textOnAccent, // dark ink on green — the Zeno look
    mutedText: c.textSecondary,
    quietText: c.textTertiary,
    border: c.borderSubtle,
    rule: c.rule,
    ruleStrong: c.ruleStrong,
    inkPanel: c.inkPanel,
    stampVerified: c.stampVerified,
    stampAlert: c.stampAlert,
    primary: c.accent,
    secondary: palette.category.blue,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
    primarySurface: c.accentSoft,
    successSurface: c.successSoft,
    warningSurface: c.warningSoft,
    dangerSurface: c.dangerSoft,
    overlay: c.overlay,
    radius: radius.md, // 12 — buttons / inputs
    cardRadius: radius.lg, // 16 — cards
    compact: false,
    shadows: true,
    heavyText: false,
    monospaceNumbers: true,
    numberFontFamily: fonts.mono.medium
  };
}

/** The one Zeno brand, in light and dark. */
export const zenoLight: ThemeTokens = buildZenoTheme("millennial", lightScheme);
export const zenoDark: ThemeTokens = buildZenoTheme("millennial", darkScheme);

/**
 * Legacy map: every ThemePreference collapses to the single Zeno brand (light),
 * so any previously-persisted preference still resolves to Zeno. Dark mode is
 * selected via color scheme, not via these keys.
 */
export const themes: Record<ThemePreference, ThemeTokens> = {
  genz: buildZenoTheme("genz", lightScheme),
  millennial: zenoLight,
  genx: buildZenoTheme("genx", lightScheme)
};

export const themeOrder: ThemePreference[] = ["genz", "millennial", "genx"];
