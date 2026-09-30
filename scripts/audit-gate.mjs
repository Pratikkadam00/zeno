#!/usr/bin/env node
// Release-blocking dependency audit with an EXPLICIT, EXPIRING allowlist.
//
// `npm audit --audit-level=high` is binary: any high/critical advisory fails,
// including ones we have examined and cannot fix (a build-time-only tool whose
// fix is a semver-major our framework pins against). Silently lowering the
// level would hide the next real one. This gate keeps the strict bar and makes
// every exception a reviewed artifact: .audit-allowlist.json entries carry a
// reason and an expiry, and an expired acceptance fails the gate just like a
// new advisory would.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BLOCKING = new Set(["high", "critical"]);

/** Pure: decide pass/fail from audit JSON + allowlist + a date. Exported for tests. */
export function evaluate(audit, allowlist, today = new Date()) {
  const accepted = new Map((allowlist.accepted ?? []).map((e) => [e.advisory, e]));
  const findings = [];
  const seen = new Set();
  for (const [pkg, v] of Object.entries(audit.vulnerabilities ?? {})) {
    if (!BLOCKING.has(v.severity)) continue; // package-level max; cheap pre-filter
    for (const via of v.via ?? []) {
      if (typeof via !== "object" || !via.url) continue; // transitive pointer, not an advisory
      // A package's severity is the MAX of its advisories. Block on each
      // advisory's OWN severity, or a moderate riding alongside a high would be
      // reported as blocking.
      if (!BLOCKING.has(via.severity)) continue;
      const id = via.url.split("/").pop();
      // npm lists the same advisory once per vulnerable path; report it once.
      if (seen.has(id)) continue;
      seen.add(id);
      const entry = accepted.get(id);
      if (!entry) {
        findings.push({ kind: "unlisted", pkg, id, severity: via.severity, title: via.title });
        continue;
      }
      if (new Date(entry.expires) < today) findings.push({ kind: "expired", pkg, id, expires: entry.expires });
    }
  }
  return { ok: findings.length === 0, findings };
}

function main() {
  let raw;
  try {
    raw = execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    raw = e.stdout; // npm audit exits 1 when it finds anything; the JSON is still on stdout
  }
  const audit = JSON.parse(raw);
  const allowlist = JSON.parse(readFileSync(new URL("../.audit-allowlist.json", import.meta.url), "utf8"));
  const { ok, findings } = evaluate(audit, allowlist);
  const meta = audit.metadata?.vulnerabilities ?? {};
  console.log(`audit-gate: ${meta.high ?? 0} high, ${meta.critical ?? 0} critical in tree; ${allowlist.accepted.length} accepted with expiry.`);
  for (const f of findings) {
    if (f.kind === "unlisted") console.error(`  BLOCK  ${String(f.severity).toUpperCase()} ${f.pkg} ${f.id} - ${f.title}`);
    else console.error(`  BLOCK  acceptance of ${f.pkg} ${f.id} EXPIRED on ${f.expires} - re-review it`);
  }
  if (ok) console.log("audit-gate: PASS");
  process.exit(ok ? 0 : 1);
}

// Run only when executed directly (not when imported by the test).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
