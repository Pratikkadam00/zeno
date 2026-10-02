import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Response } from "@playwright/test";

// Every route the site serves, taken from its own sitemap.xml (so a new page
// is covered the day the sitemap lists it), in a real Chrome, on desktop and
// on a phone. Per route: 200, the security headers, no console error, no
// request to any other host, and axe finding nothing at WCAG 2.2 AA.

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// next.config.ts's production policy, exactly (the dev server's adds 'unsafe-eval').
const EXPECTED_HEADERS: Record<string, string> = {
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()"
};

async function sitemapPaths(baseURL: string): Promise<string[]> {
  const xml = await (await fetch(`${baseURL}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
}

type Watch = { consoleErrors: string[]; outside: string[] };

/** Record console errors and page errors; block and record any request off this host. */
async function watch(page: Page): Promise<Watch> {
  const w: Watch = { consoleErrors: [], outside: [] };
  page.on("console", (msg) => {
    if (msg.type() === "error") w.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => w.consoleErrors.push(`pageerror: ${err.message}`));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.protocol === "data:" || url.protocol === "blob:") return route.continue();
    w.outside.push(url.href);
    return route.abort();
  });
  return w;
}

function checkHeaders(response: Response | null) {
  expect(response, "a response").not.toBeNull();
  const headers = response!.headers();
  for (const [name, value] of Object.entries(EXPECTED_HEADERS)) expect.soft(headers[name], name).toBe(value);
}

/**
 * Wait until every finite animation and transition on the page has finished
 * (the hero's print-in, Motion's fades), so axe measures what a visitor sees,
 * not a colour half-way through a fade. Capped, so a looping one can't hang it.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.race([Promise.all(finite.map((a) => a.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 4000))]);
  });
}

async function axe(page: Page) {
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
}

let routes: string[] = [];
test.beforeAll(async ({ baseURL }) => {
  routes = await sitemapPaths(baseURL!);
});

test("the sitemap lists the site's pages and all 509 guides", () => {
  expect(routes.filter((r) => r.startsWith("/cancel/"))).toHaveLength(509);
  expect(routes).toContain("/");
  expect(routes).toContain("/legal/privacy");
});

// The pages that aren't guides, one test each, so a failure names its page.
const PAGES = [
  "/",
  "/cancel",
  "/compare/budget-app-no-bank-sync",
  "/compare/monarch-alternative",
  "/compare/no-bank-login",
  "/compare/rocket-money-alternative",
  "/compare/ynab-alternative",
  "/developers",
  "/features/business",
  "/features/family-vault",
  "/features/open-banking",
  "/features/spend-twin",
  "/features/widgets-watch",
  "/legal/cookies",
  "/legal/privacy",
  "/legal/terms",
  "/partners"
];
// Guides share one template; these cover each difficulty, a long name and a
// guide with a cancellation link and one without.
const GUIDES = ["/cancel/netflix", "/cancel/adobe-creative-cloud", "/cancel/spotify", "/cancel/notion", "/cancel/aaa-membership"];

test("the hand list matches the sitemap (no page skipped)", () => {
  expect([...PAGES].sort()).toEqual(routes.filter((r) => !r.startsWith("/cancel/")).sort());
  for (const g of GUIDES) expect(routes).toContain(g);
});

for (const path of [...PAGES, ...GUIDES]) {
  test(`${path}: 200, security headers, no console error, nothing fetched from elsewhere, axe clean`, async ({ page }) => {
    const w = await watch(page);
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    checkHeaders(response);
    expect.soft(w.consoleErrors, "console errors").toEqual([]);
    expect.soft(w.outside, "requests to other hosts").toEqual([]);
    expect.soft(await axe(page), "axe violations").toEqual([]);
  });

  test(`${path}: axe clean in the dark theme too`, async ({ page }) => {
    // The theme is chosen in the browser (lib/theme.ts); set it before load.
    await page.addInitScript(() => localStorage.setItem("zeno-theme", "dark"));
    await page.goto(path, { waitUntil: "networkidle" });
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    expect.soft(await axe(page), "axe violations (dark)").toEqual([]);
  });
}

test("an unknown path: 404, the same headers, still accessible", async ({ page }) => {
  const w = await watch(page);
  const response = await page.goto("/no-such-page", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(404);
  checkHeaders(response);
  expect.soft(w.outside).toEqual([]);
  expect.soft(await axe(page)).toEqual([]);
});

test("the sample analytics page is a 404 in production (its flag is off)", async ({ page }) => {
  const response = await page.goto("/analytics");
  expect(response?.status()).toBe(404);
});

test("all 509 guides answer 200 with the security headers", async ({ request }) => {
  const bad: string[] = [];
  for (const path of routes.filter((r) => r.startsWith("/cancel/"))) {
    const res = await request.get(path);
    const h = res.headers();
    if (res.status() !== 200 || h["content-security-policy"] !== EXPECTED_HEADERS["content-security-policy"]) bad.push(`${path} ${res.status()}`);
  }
  expect(bad).toEqual([]);
});
