import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// P7.4 / P7 gate: the residual-risk register in docs/SECURITY_AUDIT_2026-10.md.
// Every risk has an owner and a date (or a named event), every finding it cites
// exists in the hardening log, and every open threat the threat model hands to
// the register is in it. So no residual risk is ownerless, dateless or dropped.
const ROOT = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const audit = read("docs/SECURITY_AUDIT_2026-10.md");
const log = read("docs/HARDENING_LOG.md");
const threatModel = read("docs/THREAT_MODEL.md");

type Row = { id: string; risk: string; severity: string; owner: string; date: string; source: string };
const rows: Row[] = audit
  .split("\n")
  .filter((line) => /^\| R\d+ \|/.test(line))
  .map((line) => {
    const cells = line.split(" | ").map((c) => c.replace(/^\| |\s*\|$/g, "").trim());
    const [id, risk, severity, owner, date, source] = cells as [string, string, string, string, string, string];
    return { id, risk, severity, owner, date, source };
  });

const DATE = /\d{4}-\d{2}-\d{2}|^before |^when |^each /;

describe("the residual-risk register", () => {
  it("numbers its risks R1, R2, ... without gaps", () => {
    expect(rows.length).toBeGreaterThan(25);
    expect(rows.map((r) => r.id)).toEqual(rows.map((_, i) => `R${i + 1}`));
  });

  it("every risk has a severity, an owner and a target date or event", () => {
    const bad = rows.filter((r) => !/^(High|Medium|Low)/.test(r.severity) || !/^(owner|me)/.test(r.owner) || !DATE.test(r.date));
    expect(bad.map((r) => r.id)).toEqual([]);
  });

  it("every finding it cites exists in the hardening log", () => {
    const cited = [...new Set(rows.flatMap((r) => [...`${r.risk} ${r.source}`.matchAll(/\bF(\d+)\b/g)].map((m) => `F${m[1]}`)))];
    expect(cited.length).toBeGreaterThan(15);
    expect(cited.filter((f) => !log.includes(`| ${f} |`))).toEqual([]);
  });

  it("holds every finding the threat model hands to it", () => {
    const section = threatModel.slice(threatModel.indexOf("## 6. Open threats"));
    const handed = [...new Set([...section.matchAll(/\bF(\d+)\b/g)].map((m) => `F${m[1]}`))];
    expect(handed.length).toBeGreaterThan(5);
    const register = rows.map((r) => `${r.risk} ${r.source}`).join("\n");
    expect(handed.filter((f) => !new RegExp(`\\b${f}\\b`).test(register))).toEqual([]);
  });

  it("every document it cites exists", () => {
    const docs = [...new Set([...audit.matchAll(/`((?:docs\/)?[A-Z_]+[A-Z0-9_-]*\.md)`/g)].map((m) => m[1]!))];
    expect(docs.length).toBeGreaterThan(5);
    expect(docs.filter((d) => !existsSync(resolve(ROOT, d.startsWith("docs/") ? d : `docs/${d}`)))).toEqual([]);
  });
});
