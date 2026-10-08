// W6.5 (docs/WEB_PLAN.md): every link on the live site, followed. Internal
// links must answer 200 (a redirect is reported, since the site should link
// the final address). External links, which are mostly the services' own
// cancellation pages, must answer with something other than a 4xx or 5xx, or
// a connection failure; many refuse HEAD or bots, so a GET with a browser-like
// user agent is tried before a link is called broken, and 403/429/999 from a
// bot wall are reported as "blocked", not broken.
//
//   node scripts/link-check.mjs [origin] [--internal-only]
//
// Runs nightly from .github/workflows/links.yml, where a broken internal link
// fails the job and broken external links are listed in the summary.

const ORIGIN = process.argv[2]?.startsWith("http") ? process.argv[2] : "https://zenoapp.in";
const INTERNAL_ONLY = process.argv.includes("--internal-only");
const UA = "Mozilla/5.0 (compatible; zeno-link-check/1.0; +https://zenoapp.in/about)";
const CONCURRENCY = 8;

const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const internal = new Map(); // href -> [from]
const external = new Map();
for (const page of pages) {
  const html = await (await fetch(page, { headers: { "user-agent": UA } })).text();
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, "&");
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const abs = new URL(href, page).href.split("#")[0];
    const map = abs.startsWith(ORIGIN) ? internal : external;
    if (!map.has(abs)) map.set(abs, []);
    map.get(abs).push(page.replace(ORIGIN, ""));
  }
}

async function probe(url, { browserLike = false } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20_000);
  try {
    const headers = browserLike
      ? { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", accept: "text/html,*/*" }
      : { "user-agent": UA };
    const res = await fetch(url, { method: "GET", redirect: "manual", headers, signal: controller.signal });
    return { status: res.status, location: res.headers.get("location") };
  } catch (e) {
    return { status: 0, error: e.name === "AbortError" ? "timeout" : e.cause?.code ?? e.message };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) out.push(await fn(items[i++]));
  }));
  return out;
}

console.log(`link check · ${new Date().toISOString().slice(0, 10)} · ${pages.length} pages · ${internal.size} internal links · ${external.size} external links`);

const brokenInternal = [];
for (const r of await pool([...internal.keys()], async (url) => ({ url, ...(await probe(url)) }))) {
  if (r.status !== 200) brokenInternal.push(`${r.status || r.error} ${r.url} (from ${internal.get(r.url).slice(0, 3).join(", ")})`);
}
console.log(`internal: ${internal.size - brokenInternal.length} ok, ${brokenInternal.length} not 200`);
for (const b of brokenInternal) console.log(`  ${b}`);

let brokenExternal = [];
let blocked = [];
if (!INTERNAL_ONLY) {
  const results = await pool([...external.keys()], async (url) => {
    let r = await probe(url);
    if (r.status === 0 || r.status >= 400) r = await probe(url, { browserLike: true });
    return { url, ...r };
  });
  for (const r of results) {
    if ([401, 403, 405, 429, 999].includes(r.status)) blocked.push(`${r.status} ${r.url}`);
    else if (r.status === 0 || r.status >= 400) brokenExternal.push(`${r.status || r.error} ${r.url} (from ${external.get(r.url).slice(0, 2).join(", ")})`);
  }
  console.log(`external: ${external.size - brokenExternal.length - blocked.length} ok, ${blocked.length} behind a bot wall (not counted), ${brokenExternal.length} broken`);
  for (const b of brokenExternal) console.log(`  ${b}`);
  if (blocked.length) console.log(`blocked (a human can open these; a script cannot):`);
  for (const b of blocked) console.log(`  ${b}`);
}

process.exit(brokenInternal.length ? 1 : 0);
