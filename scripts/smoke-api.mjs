#!/usr/bin/env node
// Post-deploy smoke test for the Zeno API. No dependencies (uses global fetch).
//
// Usage:
//   node scripts/smoke-api.mjs https://zeno-zw8i.onrender.com
//   node scripts/smoke-api.mjs            # defaults to the env URL or localhost
//
// Checks the things Phase 2 cares about WITHOUT needing any secret:
//   1. /health and /api/v1/health return 200
//   2. a protected route returns 401 without a token (auth guard is fail-closed)
//   3. a public catalog route returns 200
// It cannot read DATABASE_URL/persistence mode from outside — confirm that from
// the Render boot log line: "[zeno] persistence=postgres token-encryption=on".

const base = (process.argv[2] ?? process.env.PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");

const checks = [
  { name: "GET /health → 200", path: "/health", expect: 200 },
  { name: "GET /api/v1/health → 200", path: "/api/v1/health", expect: 200 },
  { name: "GET /api/v1/account (no token) → 401", path: "/api/v1/account", expect: 401 },
  { name: "GET /api/v1/services → 200", path: "/api/v1/services?q=netflix", expect: 200 }
];

let failed = 0;
console.log(`Smoke-testing ${base}\n`);
for (const check of checks) {
  try {
    const res = await fetch(`${base}${check.path}`, { method: "GET" });
    const ok = res.status === check.expect;
    console.log(`${ok ? "PASS" : "FAIL"}  ${check.name}  (got ${res.status})`);
    if (!ok) failed += 1;
  } catch (err) {
    console.log(`FAIL  ${check.name}  (${err instanceof Error ? err.message : String(err)})`);
    failed += 1;
  }
}

console.log(`\n${failed === 0 ? "All checks passed." : `${failed} check(s) failed.`}`);
process.exit(failed === 0 ? 0 : 1);
