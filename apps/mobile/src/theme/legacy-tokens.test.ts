import { describe, expect, it } from "vitest";
import { colors } from "./colors";
import { spacing } from "./spacing";
import { type } from "./typography";
import { fonts, layout } from "./zeno";

/**
 * The legacy static exports (colors.ts, spacing.ts, typography.ts), still
 * spread into screen styles. Pinned: typography roles only name typefaces that
 * fonts.ts actually loads, with a fontWeight that agrees with the weight baked
 * into the family; legacy row heights keep the minimum tap target; every
 * legacy colour is a string React Native can parse.
 */
const WEIGHT_IN_FAMILY: Record<string, string> = {
  Regular: "400",
  Medium: "500",
  SemiBold: "600",
  Bold: "700",
  ExtraBold: "800"
};

describe("typography roles", () => {
  const loadedFamilies = new Set([fonts.display, fonts.sans, fonts.mono].flatMap((g) => Object.values<string>(g)));

  it.each(Object.entries(type))("%s uses a family fonts.ts loads, with a matching weight", (_role, style) => {
    expect(loadedFamilies.has(style.fontFamily)).toBe(true);
    // Custom families encode the weight (e.g. HankenGrotesk_600SemiBold); a
    // spread fontWeight that disagreed would ask the renderer for a face that
    // was never loaded.
    const suffix = /_\d{3}([A-Za-z]+)$/.exec(style.fontFamily)?.[1];
    expect(suffix && WEIGHT_IN_FAMILY[suffix]).toBe(style.fontWeight);
    expect(style.fontFamily.includes(`_${style.fontWeight}`)).toBe(true);
  });

  it("money values use the tabular mono face", () => {
    expect(type.monoNum.fontFamily).toBe(fonts.mono.medium);
    expect(type.monoNum.fontVariant).toEqual(["tabular-nums"]);
  });
});

describe("legacy spacing", () => {
  it("a row is never shorter than the minimum tap target", () => {
    expect(spacing.rowH).toBeGreaterThanOrEqual(layout.tapMin);
  });

  it("every size is a finite, non-negative number", () => {
    const sizes = Object.values(spacing).flatMap((v) => (typeof v === "number" ? [v] : Object.values(v)));
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(Number.isFinite(size) && size >= 0, String(size)).toBe(true);
    }
  });
});

describe("legacy colors", () => {
  it.each(Object.entries(colors))("%s is a #RRGGBB or rgba() colour", (_name, value) => {
    expect(value).toMatch(/^(#[0-9A-F]{6}|rgba\(\d{1,3},\d{1,3},\d{1,3},(0|1|0?\.\d+)\))$/i);
  });
});
