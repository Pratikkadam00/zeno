#!/usr/bin/env node
// P4.5: the gate over OWASP ZAP's baseline scans (.github/workflows/dast.yml).
//
// zap-baseline.py runs with -I, so its own exit code only says the scan ran;
// this decides. It reads each scan's JSON report (ZAP's "traditional-json"
// format) and fails on:
//   - any alert of Medium or High risk (riskcode >= 2) that ZAP didn't itself
//     mark a false positive (confidence 0), unless .zap-accepted.json lists it
//     with a reason and an expiry that hasn't passed. An acceptance names
//     ZAP's alertRef, not just the rule: one rule (10055, CSP) reports several
//     different problems, and accepting one must not hide another;
//   - a scan ZAP stopped early (its "stoppingInsight"), so a cut-short scan
//     can't pass as a clean one;
//   - a report with no site in it (nothing was scanned);
//   - an acceptance past its expiry.
// Every alert, at every level, is printed as a GitHub annotation.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RISK = ["Informational", "Low", "Medium", "High"];

/** Every alert in a report, flattened, with the site it was found on. Exported for tests. */
export function alertsOf(report) {
  const out = [];
  for (const site of report?.site ?? []) {
    for (const a of site.alerts ?? []) {
      out.push({
        site: site["@name"] ?? "unknown-site",
        pluginId: String(a.pluginid ?? ""),
        alertRef: String(a.alertRef ?? a.pluginid ?? ""),
        name: a.name ?? a.alert ?? "unnamed alert",
        risk: Number.parseInt(a.riskcode ?? "0", 10),
        confidence: Number.parseInt(a.confidence ?? "1", 10),
        uris: [...new Set((a.instances ?? []).map((i) => i.uri).filter(Boolean))]
      });
    }
  }
  return out;
}

/** Pass/fail for one or more labelled reports, an acceptance list and a date. Exported for tests. */
export function evaluate(reports, accepted, today = new Date()) {
  const problems = [];
  const alerts = [];
  const list = accepted?.accepted ?? [];
  for (const entry of list) {
    if (new Date(entry.expires) < today) problems.push(`acceptance of ZAP alert ${entry.alertRef} on ${entry.target} EXPIRED on ${entry.expires}: re-review it`);
  }
  for (const { target, report } of reports) {
    if (!Array.isArray(report?.site) || report.site.length === 0) problems.push(`${target}: the report has no site in it (nothing was scanned)`);
    if (report?.stoppingInsight) problems.push(`${target}: ZAP stopped the scan early (${report.stoppingInsight.reason ?? report.stoppingInsight.description ?? "no reason given"})`);
    for (const alert of alertsOf(report)) {
      const falsePositive = alert.confidence === 0;
      const acceptance = list.find((e) => e.target === target && String(e.alertRef) === alert.alertRef);
      const blocking = alert.risk >= 2 && !falsePositive && !acceptance;
      alerts.push({ ...alert, target, falsePositive, accepted: Boolean(acceptance), blocking });
      if (blocking) problems.push(`${target}: ${RISK[alert.risk] ?? alert.risk} "${alert.name}" (ZAP alert ${alert.alertRef}) at ${alert.uris.slice(0, 3).join(", ") || alert.site}`);
    }
  }
  return { ok: problems.length === 0, problems, alerts };
}

// GitHub workflow-command escaping (as in scripts/sarif-gate.mjs).
function escapeData(s) {
  return String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/** The annotation line for an alert. Exported for tests. */
export function annotation(alert) {
  const level = alert.blocking ? "error" : alert.risk >= 1 ? "warning" : "notice";
  const note = alert.falsePositive ? " [ZAP: false positive]" : alert.accepted ? " [accepted: .zap-accepted.json]" : "";
  const where = alert.uris.length ? ` at ${alert.uris.slice(0, 3).join(", ")}${alert.uris.length > 3 ? ` (+${alert.uris.length - 3} more)` : ""}` : "";
  return `::${level} title=ZAP ${RISK[alert.risk] ?? alert.risk}: ${escapeData(alert.name)}::${escapeData(`${alert.target}: alert ${alert.alertRef}${note}${where}`)}`;
}

function main() {
  // Arguments: label=path/to/report.json ...
  const reports = process.argv.slice(2).map((arg) => {
    const at = arg.indexOf("=");
    const target = arg.slice(0, at);
    const path = arg.slice(at + 1);
    try {
      return { target, report: JSON.parse(readFileSync(path, "utf8")) };
    } catch (err) {
      return { target, report: null, error: `${path}: ${err.message}` };
    }
  });
  if (reports.length === 0) {
    console.error("zap-gate: no reports given (label=report.json ...)");
    process.exit(1);
  }
  const accepted = JSON.parse(readFileSync(new URL("../.zap-accepted.json", import.meta.url), "utf8"));
  const { ok, problems, alerts } = evaluate(reports.filter((r) => r.report), accepted);
  for (const r of reports.filter((r) => !r.report)) problems.push(`${r.target}: no readable report (${r.error})`);
  for (const alert of alerts) console.log(annotation(alert));
  const counts = RISK.map((label, risk) => `${alerts.filter((a) => a.risk === risk).length} ${label}`).join(", ");
  console.log(`zap-gate: ${reports.length} scans; alerts: ${counts}`);
  if (!ok || problems.length > 0) {
    for (const p of problems) console.error(`  BLOCK  ${p}`);
    process.exit(1);
  }
  console.log("zap-gate: PASS (no Medium or High alert)");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
