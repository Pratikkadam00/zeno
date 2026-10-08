// W5.2 (docs/WEB_PLAN.md): every template's structured data, checked by the
// schema.org validator (the same engine behind Google's Rich Results test
// for the markup itself), on the live site. One page per template.
//
//   node scripts/schema-check.mjs [origin]   → prints a table; exit 1 on any error
//
// The validator answers JSON prefixed with ")]}'"; each node lists its type,
// its properties and any errors. Warnings (recommended properties missing)
// are reported too but do not fail the check.

const ORIGIN = process.argv[2] ?? "https://zenoapp.in";
const PAGES = [
  "/",
  "/subscription-tracker",
  "/compare/no-bank-login",
  "/cancel",
  "/cancel/netflix",
  "/blog",
  "/blog/the-20-minute-subscription-audit",
  "/features",
  "/features/family-vault",
  "/about",
  "/roadmap",
  "/legal/privacy"
];

async function validate(url) {
  const res = await fetch("https://validator.schema.org/validate", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url })
  });
  const text = (await res.text()).replace(/^\)\]\}'\s*/, "");
  const data = JSON.parse(text);
  const nodes = (data.tripleGroups ?? []).flatMap((g) => g.nodes ?? []);
  const errors = [];
  const warnings = [];
  const types = [];
  for (const node of nodes) {
    types.push(node.typeGroup);
    for (const e of node.errors ?? []) (e.errorType?.toLowerCase().includes("warn") ? warnings : errors).push(`${node.typeGroup}: ${e.errorType} ${e.args?.join(" ") ?? ""}`);
    for (const p of node.properties ?? []) for (const e of p.errors ?? []) (e.errorType?.toLowerCase().includes("warn") ? warnings : errors).push(`${node.typeGroup}.${p.pred}: ${e.errorType} ${e.args?.join(" ") ?? ""}`);
  }
  return { url, types, errors, warnings };
}

let failed = false;
console.log(`schema.org validator · ${new Date().toISOString().slice(0, 10)} · ${ORIGIN}`);
for (const path of PAGES) {
  const r = await validate(`${ORIGIN}${path}`);
  const status = r.errors.length ? "ERROR" : r.warnings.length ? "ok (warnings)" : "ok";
  console.log(`${status.padEnd(14)} ${path.padEnd(42)} ${r.types.join(", ")}`);
  for (const e of r.errors) console.log(`    error: ${e}`);
  for (const w of r.warnings) console.log(`    warning: ${w}`);
  if (r.errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
