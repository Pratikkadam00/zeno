import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P3.5: the mobile app hands a URL to the OS in exactly one place,
 * apps/mobile/src/utils/external-link.ts, which enforces the allowlist. This
 * test walks the shipping mobile source and fails on any other
 * Linking.openURL / WebBrowser.openBrowserAsync call.
 */
const ROOT = join(__dirname, "..");
const SOURCE_ROOTS = ["apps/mobile/app", "apps/mobile/src"];
const ALLOWED = new Set(["apps/mobile/src/utils/external-link.ts"]);
const OPENER = /\bLinking\s*\.\s*openURL\b|\bopenBrowserAsync\b/;
const SKIP_DIR = new Set(["node_modules", "android", "ios"]);
const SKIP_FILE = /\.(test|rntest)\.[cm]?[jt]sx?$|\.d\.ts$/;

function* walk(path: string): Generator<string> {
  if (statSync(path).isFile()) {
    if (!SKIP_FILE.test(path) && /\.[cm]?[jt]sx?$/.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) if (!SKIP_DIR.has(entry)) yield* walk(join(path, entry));
}

describe("external-link guard", () => {
  it("no mobile source outside external-link.ts opens a URL directly", () => {
    const offenders: string[] = [];
    let scanned = 0;
    for (const root of SOURCE_ROOTS) {
      for (const file of walk(join(ROOT, root))) {
        scanned += 1;
        const rel = relative(ROOT, file).split(sep).join("/");
        if (ALLOWED.has(rel)) continue;
        readFileSync(file, "utf8").split("\n").forEach((line, i) => {
          if (OPENER.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(scanned).toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });

  it("the allowlisted file still exists and is the one that opens", () => {
    expect(OPENER.test(readFileSync(join(ROOT, [...ALLOWED][0]!), "utf8"))).toBe(true);
  });
});
