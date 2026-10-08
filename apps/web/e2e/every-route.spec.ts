import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Response } from "@playwright/test";
import { governedInlineScripts, hashSource } from "../../../scripts/csp-script-hashes.mjs";

// Every route the site serves, taken from its own sitemap.xml (so a new page
// is covered the day the sitemap lists it), in a real Chrome, on desktop and
// on a phone. Per route: 200, the security headers, its inline scripts allowed
// by hash and running (P4.3), no console error (a CSP violation is one), no
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
  "permissions-policy":
    "accelerometer=(), autoplay=(), browsing-topics=(), camera=(), cross-origin-isolated=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), web-share=(), xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(), gamepad=(), hid=(), idle-detection=(), serial=()",
  "x-dns-prefetch-control": "off",
  "cross-origin-opener-policy": "same-origin",
  "x-permitted-cross-domain-policies": "none"
};

/** The page's own <meta> script policy (scripts/csp-script-hashes.mjs). */
function scriptPolicy(html: string): string | undefined {
  return /<meta data-zeno-csp http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)?.[1];
}

/** Problems with a page's script policy: missing, or not exactly its own inline scripts. */
function scriptPolicyProblems(html: string): string[] {
  const policy = scriptPolicy(html);
  if (!policy) return ["no script policy"];
  const expected = `script-src 'self' ${[...new Set(governedInlineScripts(html).map(hashSource))].join(" ")}`;
  return policy === expected ? [] : [`policy ${policy.slice(0, 60)}… is not the page's own scripts`];
}

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
  expect.soft(headers["x-powered-by"], "x-powered-by").toBeUndefined();
}

/** The theme script ran (html.js) and React hydrated the page. */
async function scriptsRan(page: Page) {
  return page.evaluate(() => ({
    themeScript: document.documentElement.classList.contains("js"),
    hydrated: [...document.querySelectorAll("body *")].some((el) => Object.keys(el).some((k) => k.startsWith("__react")))
  }));
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
  "/about",
  "/blog",
  "/blog/free-trials-how-to-stop-paying-for-the-ones-you-forgot",
  "/blog/how-to-find-all-your-subscriptions",
  "/blog/the-20-minute-subscription-audit",
  "/blog/why-cancelling-a-subscription-is-harder-than-starting-one",
  "/budgeting",
  "/cancel",
  "/cancel-subscriptions",
  "/compare",
  "/compare/budget-app-no-bank-sync",
  "/compare/monarch-alternative",
  "/compare/no-bank-login",
  "/compare/rocket-money-alternative",
  "/compare/ynab-alternative",
  "/features",
  "/features/family-vault",
  "/features/spend-twin",
  "/free-trial-reminders",
  "/legal/cookies",
  "/legal/privacy",
  "/legal/terms",
  "/roadmap",
  "/subscription-tracker"
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
    expect.soft(scriptPolicyProblems(await response!.text()), "script policy").toEqual([]);
    expect.soft(await scriptsRan(page), "inline scripts ran").toEqual({ themeScript: true, hydrated: true });
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

test("an unknown path: 404, the same headers and script policy, still accessible", async ({ page }) => {
  const w = await watch(page);
  const response = await page.goto("/no-such-page", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(404);
  checkHeaders(response);
  expect.soft(scriptPolicyProblems(await response!.text()), "script policy").toEqual([]);
  expect.soft(await scriptsRan(page), "inline scripts ran").toEqual({ themeScript: true, hydrated: true });
  expect.soft(w.outside).toEqual([]);
  expect.soft(await axe(page)).toEqual([]);
});

test("a made-up guide is the same prebuilt 404, not rendered on request (F183)", async ({ request }) => {
  const made = await request.get(`/cancel/not-a-service-${Date.now()}`);
  const unknown = await request.get("/no-such-page");
  expect(made.status()).toBe(404);
  // Byte for byte the static 404 page: nothing was rendered (or cached) for this slug.
  expect(await made.text()).toBe(await unknown.text());
});

test("an injected inline script is blocked; the page's own still run (P4.3)", async ({ page }) => {
  // Stand in for an HTML-injection bug: serve the real home page with one
  // extra inline script, under the real headers.
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.route("**/", async (route) => {
    const real = await route.fetch();
    const html = (await real.text()).replace("</body>", "<script>window.__injected = true;</script></body>");
    await route.fulfill({ response: real, body: html });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(await page.evaluate(() => (window as { __injected?: boolean }).__injected)).toBeUndefined();
  expect(errors.some((e) => e.includes("Content Security Policy"))).toBe(true);
  expect(await scriptsRan(page)).toEqual({ themeScript: true, hydrated: true });
});

test("the sample analytics page is a 404 in production (its flag is off), and it's the site's own 404 (F184)", async ({ page }) => {
  const response = await page.goto("/analytics", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(404);
  // Not Next's bare error document: the root layout, its language and its theme script.
  expect(await page.getAttribute("html", "lang")).toBe("en");
  expect(await page.locator("h1").textContent()).toBe("Page not found");
  expect(await scriptsRan(page)).toEqual({ themeScript: true, hydrated: true });
  expect.soft(scriptPolicyProblems(await response!.text()), "script policy").toEqual([]);
});

test("the site has its icon (F185): an SVG favicon and an Apple touch icon, both served", async ({ page, request }) => {
  await page.goto("/");
  const icon = await page.getAttribute('link[rel="icon"]', "href");
  const apple = await page.getAttribute('link[rel="apple-touch-icon"]', "href");
  expect(icon).toMatch(/^\/icon\.svg/);
  expect(apple).toMatch(/^\/apple-icon\.png/);
  const svg = await request.get(icon!);
  expect(svg.status()).toBe(200);
  expect(svg.headers()["content-type"]).toContain("image/svg+xml");
  const png = await request.get(apple!);
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toContain("image/png");
});

test("all 509 guides answer 200 with the security headers and their own script policy", async ({ request }) => {
  // 509 fetches: batched 25 at a time, with its own time budget.
  test.setTimeout(120_000);
  const guides = routes.filter((r) => r.startsWith("/cancel/"));
  const bad: string[] = [];
  for (let i = 0; i < guides.length; i += 25) {
    await Promise.all(
      guides.slice(i, i + 25).map(async (path) => {
        const res = await request.get(path);
        if (res.status() !== 200 || res.headers()["content-security-policy"] !== EXPECTED_HEADERS["content-security-policy"]) bad.push(`${path} ${res.status()}`);
        for (const problem of scriptPolicyProblems(await res.text())) bad.push(`${path} ${problem}`);
      })
    );
  }
  expect(bad).toEqual([]);
});

// D20 (2026-10-08): the five "planned, not available today" pages became one
// roadmap page. Their addresses were in the sitemap for four days and may be
// linked from outside, so each redirects for good, in one hop.
test("the five folded feature addresses redirect to /roadmap for good", async ({ baseURL }) => {
  for (const path of ["/features/widgets-watch", "/features/open-banking", "/features/business", "/developers", "/partners"]) {
    const res = await fetch(`${baseURL}${path}`, { redirect: "manual" });
    expect([path, res.status]).toEqual([path, 308]);
    expect([path, new URL(res.headers.get("location")!, baseURL).pathname]).toEqual([path, "/roadmap"]);
  }
  const landed = await fetch(`${baseURL}/roadmap`);
  expect(landed.status).toBe(200);
});
