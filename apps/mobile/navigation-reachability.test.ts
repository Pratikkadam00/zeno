import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Repo-hygiene check: every screen registered in the root Stack must be
// reachable from SOME navigation call elsewhere in the app, or it's a silent
// dead end — exactly the class of bug found in this session (family,
// spend-twin, widgets, and wrapped were all built, real, and completely
// unreachable). This scans source TEXT (no app/module execution needed), so
// it stays cheap and has no native-module mocking to maintain.

const APP_DIR = join(__dirname, "app");
const SRC_DIR = join(__dirname, "src");
const LAYOUT_FILE = join(APP_DIR, "_layout.tsx");

// Screens intentionally NOT linked from any consumer surface (see the comment
// in _layout.tsx itself) — dev-only tools, kept as files for a future tier,
// or special root-level entries that aren't "detail screens" reached via push.
const ALLOWLIST = new Set([
  "login", "index", "(tabs)",
  "backend", "open-banking", "business", "public-api", "partners"
]);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

function registeredScreenNames(): string[] {
  const text = readFileSync(LAYOUT_FILE, "utf8");
  const names: string[] = [];
  for (const match of text.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)) {
    names.push(match[1]!);
  }
  return names;
}

describe("navigation reachability", () => {
  const screens = registeredScreenNames();
  const sourceFiles = [...walk(APP_DIR), ...walk(SRC_DIR)];
  const fileContents = new Map(sourceFiles.map((file) => [file, readFileSync(file, "utf8")]));

  it("found at least the known screens (sanity check that the scan itself works)", () => {
    expect(screens).toEqual(expect.arrayContaining(["family", "spend-twin", "widgets", "wrapped", "settings", "profile"]));
  });

  // Build a regex for a registered screen name that also matches real usage of
  // Expo Router dynamic segments — a route file named "subscription/[id]" is
  // never referenced by that literal bracketed text; real call sites always
  // interpolate an actual value, e.g. `/subscription/${sub.id}`.
  function reachabilityPattern(name: string): RegExp {
    const segments = name.split("/").map((segment) =>
      /^\[.+\]$/.test(segment)
        ? String.raw`(?:[^/"'\`]+|\$\{[^}]*\})` // a literal path segment OR a template interpolation
        : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    return new RegExp(`[\`"']/${segments.join("/")}(?:["'\`]|/)`);
  }

  it.each(screens.filter((name) => !ALLOWLIST.has(name)))(
    "screen '%s' is reachable from at least one navigation call outside _layout.tsx",
    (name) => {
      const pattern = reachabilityPattern(name);
      const hit = [...fileContents.entries()].some(([file, text]) => file !== LAYOUT_FILE && pattern.test(text));
      expect(hit).toBe(true);
    }
  );
});
