// W5.1 (docs/WEB_PLAN.md): the share cards as a social network's scraper sees
// them, on the live site. For one page per template: the Open Graph and
// Twitter tags are present and agree, the image resolves with 200, is a PNG
// of 1200 × 630, and the card type is summary_large_image. This is what the
// Facebook, LinkedIn and X validators check; their UIs need a login, this
// does not.
//
//   node scripts/og-check.mjs [origin]   → prints a table; exit 1 on any problem

import sharp from "sharp";

const ORIGIN = process.argv[2] ?? "https://zenoapp.in";
const PAGES = ["/", "/subscription-tracker", "/compare/ynab-alternative", "/cancel", "/cancel/netflix", "/blog", "/blog/the-20-minute-subscription-audit", "/features", "/about", "/roadmap", "/legal/terms"];

const meta = (html, attr, name) => new RegExp(`<meta[^>]+${attr}="${name}"[^>]+content="([^"]*)"`).exec(html)?.[1] ?? new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}="${name}"`).exec(html)?.[1];

let failed = false;
console.log(`share cards · ${new Date().toISOString().slice(0, 10)} · ${ORIGIN}`);
for (const path of PAGES) {
  const problems = [];
  const html = await (await fetch(`${ORIGIN}${path}`)).text();
  const og = { title: meta(html, "property", "og:title"), description: meta(html, "property", "og:description"), image: meta(html, "property", "og:image"), url: meta(html, "property", "og:url"), type: meta(html, "property", "og:type") };
  const tw = { card: meta(html, "name", "twitter:card"), title: meta(html, "name", "twitter:title"), image: meta(html, "name", "twitter:image") };
  for (const [k, v] of Object.entries(og)) if (!v) problems.push(`og:${k} missing`);
  if (tw.card !== "summary_large_image") problems.push(`twitter:card is ${tw.card}`);
  if (tw.title !== og.title) problems.push("twitter:title differs from og:title");
  if (tw.image !== og.image) problems.push("twitter:image differs from og:image");
  if (og.url !== `${ORIGIN}${path}` && !(path === "/" && og.url === ORIGIN)) problems.push(`og:url is ${og.url}`);
  let dims = "";
  if (og.image) {
    const res = await fetch(og.image);
    if (res.status !== 200) problems.push(`image ${res.status}`);
    else {
      const m = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
      dims = `${m.width}×${m.height} ${m.format}`;
      if (m.width !== 1200 || m.height !== 630) problems.push(`image is ${dims}`);
    }
  }
  console.log(`${(problems.length ? "PROBLEM" : "ok").padEnd(8)} ${path.padEnd(42)} ${og.image?.replace(ORIGIN, "") ?? "-"} ${dims}`);
  for (const p of problems) console.log(`    ${p}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
