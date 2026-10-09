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
    ["textOnInk", "inkPanel"],
    // F178: tertiary text and the coloured ink, on every surface they sit on
    // (they were never checked, and three were below 4.5:1).
    ...(["textTertiary", "stampVerified", "stampAlert", "accentText"] as const).flatMap(
      (fg) => (["bgApp", "surfaceCard", "surfaceSunken", "surfaceRaised"] as const).map((bg) => [fg, bg] as [keyof ColorScheme, keyof ColorScheme])
    )
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

  // ── F233 ────────────────────────────────────────────────────────────────
  // The four status colours are FILL grade. Painted as text they failed 1.4.3
  // badly on paper (warning 2.04:1, success 3.10, danger 3.67, info 3.68), and
  // on the dark desk they failed on their own soft chip (danger 3.83 on a
  // raised card). Every place that paints text now uses the TEXT grade, and
  // these pin it, including on the chip the text actually sits on.

  /** A soft token may be `rgba(r,g,b,a)` (the dark chips are the tone at 16 %).
   *  A chip is only as readable as what shows through it, so composite. */
  function flatten(color: string, behind: string): string {
    const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
    if (!rgba) return color;
    const [, r, g, b, a] = rgba;
    const alpha = Number(a);
    const under = [1, 3, 5].map((i) => parseInt(behind.slice(i, i + 2), 16));
    const mixed = [Number(r), Number(g), Number(b)].map((channel, i) =>
      Math.round(alpha * channel + (1 - alpha) * under[i]!)
    );
    return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }

  it("flatten composites a translucent chip over what is behind it", () => {
    expect(flatten("#E6F7EE", "#FFFFFF")).toBe("#E6F7EE"); // already opaque
    expect(flatten("rgba(0, 0, 0, 0.5)", "#FFFFFF")).toBe("#808080");
    expect(flatten("rgba(255, 255, 255, 1)", "#000000")).toBe("#FFFFFF");
  });

  const TONES = ["success", "warning", "danger", "info"] as const;
  const SURFACES = ["bgApp", "surfaceCard", "surfaceSunken", "surfaceRaised"] as const;

  describe.each([
    ["light", lightScheme],
    ["dark", darkScheme]
  ] as const)("%s scheme, status colours (F233)", (_name, scheme) => {
    it.each(TONES.flatMap((tone) => SURFACES.map((surface) => [tone, surface] as const)))(
      "%sText on %s is at least 4.5:1",
      (tone, surface) => {
        expect(contrast(scheme[`${tone}Text`], scheme[surface])).toBeGreaterThanOrEqual(4.5);
      }
    );

    it.each(TONES.flatMap((tone) => SURFACES.map((surface) => [tone, surface] as const)))(
      "%sText on its own soft chip, over %s, is at least 4.5:1",
      (tone, surface) => {
        const chip = flatten(scheme[`${tone}Soft`], scheme[surface]);
        expect(contrast(scheme[`${tone}Text`], chip)).toBeGreaterThanOrEqual(4.5);
      }
    );

    it.each(TONES)("a solid %s chip carries ink, which clears 4.5:1 on it", (tone) => {
      // Badge.tsx: every solid chip but the neutral one is ink on the fill.
      expect(contrast(palette.ink[900], scheme[tone])).toBeGreaterThanOrEqual(4.5);
    });

    it("the neutral solid chip is the one dark fill, so it keeps white", () => {
      expect(contrast(palette.ink[900], palette.ink[700])).toBeLessThan(3); // why not ink
      expect(contrast("#FFFFFF", palette.ink[700])).toBeGreaterThanOrEqual(4.5);
    });

    // The fill grade's load-bearing use is a button a sentence sits on:
    // "Confirm it stopped" on the green, "Re-open cancellation help" on the
    // red (subscription/[id].tsx), "Yes, I cancelled" on the green (the
    // cancel guide). All three paint textOnAccent.
    it.each(["success", "danger"] as const)("a button filled %s carries text that clears 4.5:1", (tone) => {
      expect(contrast(scheme.textOnAccent, scheme[tone])).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("the fill grades really were too light to read on paper (why F233 exists)", () => {
    // The regression this guards: each of these is what the screens used to paint.
    expect(contrast(lightScheme.warning, lightScheme.surfaceCard)).toBeLessThan(4.5);
    expect(contrast(lightScheme.success, lightScheme.surfaceCard)).toBeLessThan(4.5);
    expect(contrast(lightScheme.danger, lightScheme.surfaceCard)).toBeLessThan(4.5);
    expect(contrast(lightScheme.info, lightScheme.surfaceCard)).toBeLessThan(4.5);
    // And white on a solid status chip, which Badge used to paint.
    expect(contrast("#FFFFFF", lightScheme.success)).toBeLessThan(4.5);
  });

  it("why the dark button is paper, and text on green is ink: the alternatives fail", () => {
    // The ColorScheme comment: an ink button on the #0A0C13 desk is ~1.3:1.
    expect(contrast(palette.ledger.inkPanel, darkScheme.bgApp)).toBeLessThan(3);
    // "never white-on-green": white on the brand green is below 4.5:1.
    expect(contrast(palette.white, lightScheme.accent)).toBeLessThan(4.5);
  });
});
