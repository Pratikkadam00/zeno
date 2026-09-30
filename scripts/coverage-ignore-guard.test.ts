import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Coverage-ignore guard. The Tier 1 floor is 100 % lines, which is only honest
 * if nobody can reach it by hiding code. Every coverage-ignore comment must
 * therefore say WHY, in the form the coverage tool honours (verified against
 * @vitest/coverage-v8 on 2026-09-30: the trailing "-- reason" is accepted and
 * the ignored lines drop out of the report):
 *
 *   /* v8 ignore next -- <reason, at least 15 characters> *\/
 *   /* v8 ignore start -- <reason> *\/ … /* v8 ignore stop *\/
 *
 * `ignore file` is banned outright: a whole file opted out of the floor is a
 * scope decision, and scope lives in vitest.config.ts where it is reviewed.
 */

const ROOT = join(__dirname, "..");
const SOURCE_ROOTS = ["apps", "packages", "scripts"];
const SKIP_DIR = new Set(["node_modules", ".next", "dist", "build", "coverage", ".expo", "android", "ios"]);
const SOURCE_FILE = /\.(ts|tsx|mts|cts|mjs|cjs|js|jsx)$/;
const MIN_REASON = 15;

const IGNORE = /\b(v8|c8|istanbul|node:coverage)\s+ignore\s+([a-z]+)(?:\s+\d+)?([^*\n]*)/gi;

export type Violation = { line: number; text: string; problem: string };

/** Pure: every problem with the coverage-ignore comments in one file's text. */
export function checkIgnores(text: string): Violation[] {
  const out: Violation[] = [];
  const lines = text.split("\n");
  lines.forEach((raw, i) => {
    for (const m of raw.matchAll(IGNORE)) {
      const kind = m[2].toLowerCase();
      const rest = m[3] ?? "";
      const at = { line: i + 1, text: raw.trim().slice(0, 120) };
      if (kind === "stop") continue; // closes a block whose `start` carried the reason
      if (kind === "file") {
        out.push({ ...at, problem: "`ignore file` is banned; change the scope in vitest.config.ts instead" });
        continue;
      }
      const reason = /--\s*(.*)$/.exec(rest)?.[1]?.trim() ?? "";
      if (reason.length < MIN_REASON) {
        out.push({ ...at, problem: `missing a reason: write "${m[1]} ignore ${kind} -- <why, ${MIN_REASON}+ chars>"` });
      }
    }
  });
  return out;
}

function* walk(path: string): Generator<string> {
  const st = statSync(path);
  if (st.isFile()) {
    if (SOURCE_FILE.test(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path)) {
    if (SKIP_DIR.has(entry)) continue;
    yield* walk(join(path, entry));
  }
}

describe("coverage-ignore guard: checkIgnores (the rule itself)", () => {
  it("accepts a next/start ignore that carries a reason", () => {
    expect(checkIgnores("/* v8 ignore next -- defensive: pg never returns null here */")).toEqual([]);
    expect(checkIgnores("/* v8 ignore start -- Plaid stays in dev by instruction */")).toEqual([]);
    expect(checkIgnores("/* v8 ignore next 3 -- three-line platform fallback for web */")).toEqual([]);
  });

  it("accepts a bare `stop` (the matching start carried the reason)", () => {
    expect(checkIgnores("/* v8 ignore stop */")).toEqual([]);
  });

  it("rejects an ignore with no reason, a too-short reason, or no separator", () => {
    expect(checkIgnores("/* v8 ignore next */")).toHaveLength(1);
    expect(checkIgnores("/* v8 ignore next -- ok */")).toHaveLength(1);
    expect(checkIgnores("/* v8 ignore next because reasons that are long */")).toHaveLength(1);
  });

  it("rejects the other tools' spellings too, so the rule can't be dodged", () => {
    expect(checkIgnores("/* istanbul ignore next */")).toHaveLength(1);
    expect(checkIgnores("/* c8 ignore start */")).toHaveLength(1);
    expect(checkIgnores("// node:coverage ignore next")).toHaveLength(1);
  });

  it("bans `ignore file` even with a reason", () => {
    const v = checkIgnores("/* v8 ignore file -- the whole thing is platform glue */");
    expect(v).toHaveLength(1);
    expect(v[0].problem).toMatch(/banned/);
  });

  it("reports the right line number", () => {
    expect(checkIgnores("a\nb\n/* v8 ignore next */\n")[0].line).toBe(3);
  });
});

describe("coverage-ignore guard: the repository", () => {
  it("every coverage-ignore comment in shipping source carries a reason", () => {
    const offenders: string[] = [];
    for (const root of SOURCE_ROOTS) {
      for (const file of walk(join(ROOT, root))) {
        const rel = relative(ROOT, file).split(sep).join("/");
        if (rel === "scripts/coverage-ignore-guard.test.ts") continue; // its own examples
        for (const v of checkIgnores(readFileSync(file, "utf8"))) offenders.push(`${rel}:${v.line}  ${v.problem}\n    ${v.text}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
