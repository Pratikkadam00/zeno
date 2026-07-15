// Legacy static exports (still used by some screens; superseded by ./zeno).
export { colors } from './colors';
export { type } from './typography';
export { spacing } from './spacing';

// Canonical Zeno design tokens (single source of truth — ported from the
// Zeno Design System). Prefer these for all new/ported screens.
export * from './zeno';

// Single Zeno brand behind the legacy ThemeTokens interface (3 modes retired).
export { themes, themeOrder, zenoLight, zenoDark, type ThemeTokens } from './tokens';
export { ZenoThemeProvider, useZenoTheme } from './theme-provider';

// Motion (Reanimated springs + print-in + reduced-motion) and haptics.
export { springs, printIn, useReducedMotion, PRINT_STAGGER_MS, PRINT_DURATION_MS } from './motion';
export { haptics } from './haptics';
