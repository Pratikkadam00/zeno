import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// P7.3: docs/MASVS_CHECKLIST.md names, for each control, the tests that hold it.
// This keeps those names true: every test it quotes exists in the code word for
// word, and every file it cites exists, so a renamed or deleted test fails here
// instead of leaving the checklist pointing at nothing.
const ROOT = resolve(import.meta.dirname, "..");
const doc = readFileSync(resolve(ROOT, "docs/MASVS_CHECKLIST.md"), "utf8");

// A test list runs from "›" to the next ";" or the end of the table cell.
function quotedTestNames(text: string): string[] {
  const names = new Set<string>();
  for (const segment of text.split("›").slice(1)) {
    for (const m of segment.split(/;| \| /)[0]!.matchAll(/"([^"]{12,})"/g)) names.add(m[1]!.replace(/…$/, ""));
  }
  return [...names];
}

// Cited paths are relative to the repository, the app, or docs/.
const BASES = ["", "apps/mobile/", "apps/mobile/src/monitoring/", "docs/", ".github/workflows/"];
const NOT_OURS = new Set(["controls/MASVS-*.md"]); // a path in OWASP's repository

describe("docs/MASVS_CHECKLIST.md", () => {
  const testSources = execSync('git ls-files "apps/*.test.ts" "apps/*.test.tsx" "apps/*.rntest.tsx" "scripts/*.test.ts"', { cwd: ROOT })
    .toString().trim().split("\n")
    .filter((file) => file !== "scripts/masvs-checklist.test.ts") // its own sample name below
    .map((file) => readFileSync(resolve(ROOT, file), "utf8"))
    .join("\n");

  it("every quoted test exists, word for word", () => {
    const names = quotedTestNames(doc);
    expect(names.length).toBeGreaterThan(30);
    expect(names.filter((name) => !testSources.includes(name))).toEqual([]);
  });

  it("every cited file exists", () => {
    const paths = [...new Set([...doc.matchAll(/`([^`\s]+\.(?:ts|tsx|mjs|yml|md))`/g)].map((m) => m[1]!))].filter((p) => !NOT_OURS.has(p));
    expect(paths.length).toBeGreaterThan(30);
    expect(paths.filter((p) => !BASES.some((base) => existsSync(resolve(ROOT, base + p))))).toEqual([]);
  });

  it("the check itself catches a renamed test", () => {
    expect(quotedTestNames('| x | `a.test.ts` › "a test that was renamed long ago" |')).toEqual(["a test that was renamed long ago"]);
    expect(testSources.includes("a test that was renamed long ago")).toBe(false);
  });
});
