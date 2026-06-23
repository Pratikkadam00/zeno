import { fonts } from "./zeno";

/**
 * Legacy type roles, now mapped to the Zeno typefaces so every screen that
 * spreads `typography` adopts the brand type automatically:
 *   Display (Space Grotesk) — large titles & balances
 *   UI/Body (Hanken Grotesk) — everything in-product
 *   Mono (JetBrains Mono, tabular) — money values
 * Custom fonts encode weight in the family, so the family is the weight; any
 * extra `fontWeight` a caller spreads on top is simply ignored by the renderer.
 */
export const type = {
  largeTitle:  { fontSize: 34, fontFamily: fonts.display.bold,     letterSpacing: -1.0, fontWeight: '700' as const },
  title1:      { fontSize: 28, fontFamily: fonts.display.bold,     letterSpacing: -0.8, fontWeight: '700' as const },
  title2:      { fontSize: 22, fontFamily: fonts.display.semibold, letterSpacing: -0.4, fontWeight: '600' as const },
  title3:      { fontSize: 20, fontFamily: fonts.display.semibold, letterSpacing: -0.3, fontWeight: '600' as const },
  headline:    { fontSize: 17, fontFamily: fonts.sans.semibold,    letterSpacing: -0.2, fontWeight: '600' as const },
  body:        { fontSize: 15, fontFamily: fonts.sans.regular,     letterSpacing: -0.1, fontWeight: '400' as const },
  callout:     { fontSize: 16, fontFamily: fonts.sans.regular,     letterSpacing: -0.1, fontWeight: '400' as const },
  subheadline: { fontSize: 15, fontFamily: fonts.sans.medium,      letterSpacing: -0.1, fontWeight: '500' as const },
  footnote:    { fontSize: 13, fontFamily: fonts.sans.regular,     letterSpacing: -0.05, fontWeight: '400' as const },
  caption1:    { fontSize: 12, fontFamily: fonts.sans.regular,     letterSpacing: 0, fontWeight: '400' as const },
  caption2:    { fontSize: 11, fontFamily: fonts.sans.medium,      letterSpacing: 0.06, fontWeight: '500' as const },
  sectionHeader:{ fontSize: 11, fontFamily: fonts.sans.semibold,   letterSpacing: 0.08,
                  textTransform: 'uppercase' as const, fontWeight: '600' as const },
  monoNum:     { fontSize: 15, fontFamily: fonts.mono.medium, fontVariant: ['tabular-nums'] as const, fontWeight: '500' as const },
} as const;
