#!/usr/bin/env node
// Zero-findings gate for SARIF output (CodeQL). The CodeQL action uploads its
// results to the Security tab, but by itself never fails the job on a finding,
// and the Security tab is not readable without repository write access. This
// gate (1) prints every unsuppressed result as a GitHub annotation, so it is
// visible on the run to anyone who can read the repo, and (2) exits 1 if there
// is any, so a new finding turns CI red instead of sitting unread in a tab.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Pure: every unsuppressed result in a SARIF log, flattened. Exported for tests. */
export function collectFindings(sarif) {
  const out = [];
  for (const run of sarif?.runs ?? []) {
    const rules = run.tool?.driver?.rules ?? [];
    for (const res of run.results ?? []) {
      // In-source suppressions and dismissals arrive as `suppressions` entries.
      if (Array.isArray(res.suppressions) && res.suppressions.length > 0) continue;
      const rule = typeof res.rule?.index === "number" ? rules[res.rule.index] : rules.find((r) => r.id === res.ruleId);
      const level = res.level ?? rule?.defaultConfiguration?.level ?? "warning";
      if (level === "none") continue;
      const loc = res.locations?.[0]?.physicalLocation;
      out.push({
        ruleId: res.ruleId ?? rule?.id ?? "unknown-rule",
        level,
        file: loc?.artifactLocation?.uri ?? "unknown-file",
        line: loc?.region?.startLine ?? 1,
        message: res.message?.text ?? ""
      });
    }
  }
  return out;
}

// GitHub workflow-command escaping (actions/toolkit: escapeData / escapeProperty).
export function escapeData(s) {
  return String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
export function escapeProperty(s) {
  return escapeData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

/** Pure: one `::error` annotation line for a finding. */
export function annotation(f) {
  return `::error file=${escapeProperty(f.file)},line=${f.line},title=${escapeProperty(f.ruleId)}::${escapeData(`[${f.level}] ${f.message}`)}`;
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: node scripts/sarif-gate.mjs <sarif-dir>");
    process.exit(2);
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".sarif"));
  if (files.length === 0) {
    // No SARIF means the analysis did not run — never report that as a pass.
    console.error(`sarif-gate: no .sarif files in ${dir} — refusing to pass.`);
    process.exit(1);
  }
  const findings = files.flatMap((f) => collectFindings(JSON.parse(readFileSync(join(dir, f), "utf8"))));
  console.log(`sarif-gate: ${files.length} SARIF file(s), ${findings.length} unsuppressed finding(s).`);
  for (const f of findings) console.log(annotation(f));
  process.exit(findings.length === 0 ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
