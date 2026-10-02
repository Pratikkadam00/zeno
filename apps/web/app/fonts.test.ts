import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * F103: the site's fonts are self-hosted, so `next build` needs no network.
 * next/font can't run under vitest, so this reads the source: no Google font
 * import comes back, every file app/fonts.ts names is a real woff2 with its
 * licence beside it, and every extra range joins its family under the name
 * Turbopack gives the CSS variable (the const name; a different name renders
 * the fallback font, as the first build of this change showed).
 */
const WEB = join(__dirname, "..");
const FONTS_TS = readFileSync(join(__dirname, "fonts.ts"), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next") return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|mjs|css)$/.test(entry) && !entry.endsWith(".test.ts") ? [full] : [];
  });
}

const calls = [...FONTS_TS.matchAll(/const (\w+) = localFont\(\{\s*src: "([^"]+)"[\s\S]*?\n\}\);/g)].map((m) => ({
  name: m[1]!,
  src: m[2]!,
  family: /prop: "font-family", value: "([^"]+)"/.exec(m[0])?.[1],
  variable: /variable: "([^"]+)"/.exec(m[0])?.[1]
}));

describe("self-hosted fonts (F103)", () => {
  it("nothing in the site loads fonts from Google at build time", () => {
    const offenders = ["app", "components", "lib"].flatMap((d) => sourceFiles(join(WEB, d))).filter((f) => /(?:from|import|require\()\s*["']next\/font\/google["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("13 font files, each a real woff2 named once", () => {
    expect(calls).toHaveLength(13);
    expect(new Set(calls.map((c) => c.src)).size).toBe(13);
    for (const { src } of calls) {
      const bytes = readFileSync(join(__dirname, src));
      expect(bytes.subarray(0, 4).toString("latin1"), src).toBe("wOF2");
    }
  });

  it("each family folder carries its SIL Open Font License", () => {
    for (const folder of new Set(calls.map((c) => dirname(c.src)))) {
      expect(readFileSync(join(__dirname, folder, "OFL.txt"), "utf8")).toContain("SIL Open Font License, Version 1.1");
    }
  });

  it("three families, each with one Latin call that names it and sets the variable; every other range joins it by that name", () => {
    const mains = calls.filter((c) => c.variable);
    expect(mains.map((c) => [c.name, c.variable])).toEqual([
      ["spaceGrotesk", "--font-display"],
      ["hankenGrotesk", "--font-body"],
      ["jetbrainsMono", "--font-mono"]
    ]);
    for (const main of mains) {
      expect(main.family, `${main.name} must not override its family`).toBeUndefined();
      expect(main.src).toMatch(/\/latin\.woff2$/);
      const extras = calls.filter((c) => !c.variable && dirname(c.src) === dirname(main.src));
      expect(extras.length).toBeGreaterThan(0);
      for (const extra of extras) expect(extra.family, extra.name).toBe(main.name);
    }
  });
});
