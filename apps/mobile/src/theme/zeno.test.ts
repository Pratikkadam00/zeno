import { describe, expect, it } from "vitest";
import { themeOrder, themes, zenoDark, zenoLight } from "./tokens";
import {
  darkScheme,
  fontSize,
  fonts,
  layout,
  letterSpacing,
  lightScheme,
  lineHeight,
  motion,
  palette,
  radius,
  shadow,
  space,
  zenoTokens,
  type ColorScheme
} from "./zeno";

/**
 * zeno.ts: the single Honest Ledger brand. Pinned here:
 *  - zenoTokens() picks the colour scheme (light by default) and shares every
 *    other token bundle between schemes;
 *  - every legacy ThemePreference id resolves to that one brand;
 *  - the WCAG contrast promises the token comments make actually hold.
 */
describe("zenoTokens", () => {
  it("defaults to the light scheme", () => {
    const tokens = zenoTokens();
    expect(tokens.scheme).toBe("light");
    expect(tokens.color).toBe(lightScheme);
  });

  it("selects the scheme it is asked for", () => {
    expect(zenoTokens("light")).toMatchObject({ scheme: "light", color: lightScheme });
    expect(zenoTokens("dark")).toMatchObject({ scheme: "dark", color: darkScheme });
  });

  it("only the colour scheme differs between light and dark; every other bundle is the one shared token set", () => {
    const light = zenoTokens("light");
    const dark = zenoTokens("dark");
    const shared = { palette, space, layout, radius, fonts, fontSize, lineHeight, letterSpacing, shadow, motion };
    for (const [name, bundle] of Object.entries(shared)) {
      expect(light[name as keyof typeof shared], name).toBe(bundle);
      expect(dark[name as keyof typeof shared], name).toBe(bundle);
    }
    expect(Object.keys(light).sort()).toEqual(["color", "scheme", ...Object.keys(shared)].sort());
  });
});

describe("one brand behind every legacy theme id", () => {
  it("each ThemePreference resolves to the light Zeno brand; only the retained id differs", () => {
    expect([...themeOrder].sort()).toEqual(Object.keys(themes).sort());
    for (const id of themeOrder) {
      const { id: themeId, ...look } = themes[id];
      const { id: _brandId, ...brand } = zenoLight;
      expect(themeId).toBe(id);
      expect(look).toEqual(brand);
    }
  });

  it("the legacy light/dark bundles are built from the zeno.ts schemes", () => {
    expect(zenoLight).toMatchObject({ background: lightScheme.bgApp, text: lightScheme.textPrimary, primary: lightScheme.accent });
    expect(zenoDark).toMatchObject({ background: darkScheme.bgApp, text: darkScheme.textPrimary, primary: darkScheme.accent });
  });
});

/** WCAG 2.x relative-luminance contrast ratio of two #RRGGBB colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    expect(hex, `${hex} is not #RRGGBB`).toMatch(/^#[0-9A-F]{6}$/i);
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("contrast promises (WCAG 2.1 AA)", () => {
  it("the helper matches the WCAG reference points", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  const text: [keyof ColorScheme, keyof ColorScheme][] = [
    ["textPrimary", "bgApp"],
    ["textPrimary", "surfaceCard"],
    ["textSecondary", "bgApp"],
    ["textSecondary", "surfaceCard"],
    ["buttonPrimaryText", "buttonPrimaryBg"],
    ["textOnAccent", "accent"],
    ["textOnInk", "inkPanel"]
  ];

  describe.each([
    ["light", lightScheme],
    ["dark", darkScheme]
  ] as const)("%s scheme", (_name, scheme) => {
    it.each(text)("%s on %s is at least 4.5:1 (1.4.3 text)", (fg, bg) => {
      expect(contrast(scheme[fg], scheme[bg])).toBeGreaterThanOrEqual(4.5);
    });

    it("the primary button stands out from the desk at 3:1 or more (1.4.11 control bounds)", () => {
      expect(contrast(scheme.buttonPrimaryBg, scheme.bgApp)).toBeGreaterThanOrEqual(3);
      expect(contrast(scheme.buttonPrimaryBg, scheme.surfaceCard)).toBeGreaterThanOrEqual(3);
    });
  });

  it("why the dark button is paper, and text on green is ink: the alternatives fail", () => {
    // The ColorScheme comment: an ink button on the #0A0C13 desk is ~1.3:1.
    expect(contrast(palette.ledger.inkPanel, darkScheme.bgApp)).toBeLessThan(3);
    // "never white-on-green": white on the brand green is below 4.5:1.
    expect(contrast(palette.white, lightScheme.accent)).toBeLessThan(4.5);
  });
});
