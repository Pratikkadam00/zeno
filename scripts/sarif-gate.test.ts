import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { annotation, collectFindings, escapeData, escapeProperty } from "./sarif-gate.mjs";

const result = (over: Record<string, unknown> = {}) => ({
  ruleId: "js/sql-injection",
  level: "error",
  message: { text: "User input flows to a query." },
  locations: [{ physicalLocation: { artifactLocation: { uri: "apps/api/src/app.ts" }, region: { startLine: 42 } } }],
  ...over
});
const log = (results: unknown[], rules: unknown[] = []) => ({ runs: [{ tool: { driver: { name: "CodeQL", rules } }, results }] });

describe("sarif-gate.collectFindings", () => {
  it("an empty log has no findings", () => {
    expect(collectFindings({ runs: [] })).toEqual([]);
    expect(collectFindings({})).toEqual([]);
    expect(collectFindings(log([]))).toEqual([]);
  });

  it("flattens a result to rule, level, file, line, message", () => {
    expect(collectFindings(log([result()]))).toEqual([
      { ruleId: "js/sql-injection", level: "error", file: "apps/api/src/app.ts", line: 42, message: "User input flows to a query." }
    ]);
  });

  it("skips suppressed results but keeps everything else", () => {
    const findings = collectFindings(log([result({ suppressions: [{ kind: "inSource" }] }), result({ ruleId: "js/xss" })]));
    expect(findings.map((f: { ruleId: string }) => f.ruleId)).toEqual(["js/xss"]);
  });

  it("resolves the rule by index and falls back to the rule's default level", () => {
    const rules = [{ id: "js/a", defaultConfiguration: { level: "note" } }, { id: "js/b", defaultConfiguration: { level: "warning" } }];
    const findings = collectFindings(log([{ rule: { index: 1 }, message: { text: "m" }, locations: [] }], rules));
    expect(findings).toEqual([{ ruleId: "js/b", level: "warning", file: "unknown-file", line: 1, message: "m" }]);
  });

  it("notes and warnings block too (only level 'none' is ignored)", () => {
    const findings = collectFindings(log([result({ level: "note" }), result({ level: "warning" }), result({ level: "none" })]));
    expect(findings.map((f: { level: string }) => f.level)).toEqual(["note", "warning"]);
  });

  it("counts results across multiple runs", () => {
    expect(collectFindings({ runs: [log([result()]).runs[0], log([result(), result()]).runs[0]] })).toHaveLength(3);
  });
});

describe("sarif-gate annotations", () => {
  it("escapes workflow-command metacharacters so a message can't inject commands", () => {
    expect(escapeData("50%\r\n::warning::x")).toBe("50%25%0D%0A::warning::x");
    expect(escapeProperty("a:b,c%")).toBe("a%3Ab%2Cc%25");
  });

  it("formats one ::error line per finding", () => {
    const [f] = collectFindings(log([result({ message: { text: "line1\nline2" } })]));
    expect(annotation(f)).toBe("::error file=apps/api/src/app.ts,line=42,title=js/sql-injection::[error] line1%0Aline2");
  });
});

describe("sarif-gate CLI", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = "";
  });
  const run = (d: string) => spawnSync(process.execPath, [join(__dirname, "sarif-gate.mjs"), d], { encoding: "utf8" });

  it("passes (exit 0) on a clean SARIF", () => {
    dir = mkdtempSync(join(tmpdir(), "sarif-"));
    writeFileSync(join(dir, "javascript.sarif"), JSON.stringify(log([])));
    const r = run(dir);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("0 unsuppressed finding(s)");
  });

  it("fails (exit 1) and prints an annotation for each finding", () => {
    dir = mkdtempSync(join(tmpdir(), "sarif-"));
    writeFileSync(join(dir, "javascript.sarif"), JSON.stringify(log([result(), result({ ruleId: "js/xss" })])));
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.stdout.match(/^::error /gm)).toHaveLength(2);
  });

  it("REFUSES to pass when there is no SARIF at all (analysis didn't run)", () => {
    dir = mkdtempSync(join(tmpdir(), "sarif-"));
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("refusing to pass");
  });
});
