// W6.4 (docs/WEB_PLAN.md): the HTML of one live page per template, checked by
// the W3C Nu HTML checker (validator.w3.org/nu). Errors fail; warnings and
// info are listed.
//
//   node scripts/html-check.mjs [origin]

const ORIGIN = process.argv[2] ?? "https://zenoapp.in";
const PAGES = ["/", "/subscription-tracker", "/compare/no-bank-login", "/cancel", "/cancel/netflix", "/blog", "/blog/the-20-minute-subscription-audit", "/features", "/features/spend-twin", "/about", "/roadmap", "/legal/privacy", "/this-page-does-not-exist"];

let failed = false;
console.log(`Nu HTML checker · ${new Date().toISOString().slice(0, 10)} · ${ORIGIN}`);
for (const path of PAGES) {
  const html = await (await fetch(`${ORIGIN}${path}`)).text();
  const res = await fetch("https://validator.w3.org/nu/?out=json", {
    method: "POST",
    headers: { "content-type": "text/html; charset=utf-8", "user-agent": "zeno-html-check (https://zenoapp.in)" },
    body: html
  });
  const { messages = [] } = await res.json();
  const errors = messages.filter((m) => m.type === "error");
  const others = messages.filter((m) => m.type !== "error");
  console.log(`${(errors.length ? "ERROR" : "ok").padEnd(6)} ${path.padEnd(42)} ${errors.length} errors, ${others.length} warnings/info`);
  for (const m of [...errors, ...others]) console.log(`    ${m.type}${m.subType ? `/${m.subType}` : ""} line ${m.lastLine}: ${m.message}`);
  if (errors.length) failed = true;
  await new Promise((r) => setTimeout(r, 1500)); // be polite to the shared checker
}
process.exit(failed ? 1 : 0);
