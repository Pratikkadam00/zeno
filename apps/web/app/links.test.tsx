// @vitest-environment jsdom
import { services } from "@zeno/service-catalog";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LANDINGS } from "@/lib/landings";
import { listPages, parse, renderPage } from "@/test-support/pages";
import GuidePage from "./cancel/[slug]/page";
import { POSTS } from "./blog/posts";

// W5.5 (docs/WEB_PLAN.md): the internal mesh (SEO.md §5.2). Every post sends
// readers on to a cancellation guide, a landing page and another post; every
// guide links its hub and at least three neighbouring guides; every landing
// page and compare page links onward to at least three other pages of the
// site; and nothing on the site is an orphan (every sitemap page is linked
// from some other page's main column, not only the footer).

vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

type Links = { url: string; main: string[]; all: string[] };
let pages: Links[] = [];
let guides: Links[] = [];

function linksOf(url: string, doc: Document): Links {
  const hrefs = (root: ParentNode) => [...root.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")!).filter((h) => h.startsWith("/")).map((h) => h.split("#")[0]!).filter(Boolean);
  const main = doc.querySelector("main") ?? doc.body;
  return { url, main: [...new Set(hrefs(main))], all: [...new Set(hrefs(doc.body))] };
}

beforeAll(async () => {
  const templates = listPages();
  const postTemplate = templates.find((p) => p.route === "/blog/[slug]")!;
  pages = await Promise.all([
    ...templates
      .filter((p) => !p.route.includes("[") && p.route !== "/analytics")
      .map(async (p) => linksOf(p.route, parse((await renderPage(p)).html))),
    ...POSTS.map(async (post) => linksOf(`/blog/${post.slug}`, parse((await renderPage(postTemplate, { slug: post.slug })).html)))
  ]);
  guides = await Promise.all(services.map(async (s) => linksOf(`/cancel/${s.slug}`, parse(renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ slug: s.slug }) }))))));
}, 120_000);

const landingPaths = LANDINGS.map((l) => l.path);

describe("posts", () => {
  it("each links a cancellation guide or the guides hub, a landing page, and another post", () => {
    for (const post of POSTS) {
      const hrefs = post.related.map(([, href]) => href);
      expect(hrefs.some((h) => h.startsWith("/cancel")), `${post.slug}: a guide or the hub`).toBe(true);
      expect(hrefs.some((h) => landingPaths.includes(h)), `${post.slug}: a landing page`).toBe(true);
      const page = pages.find((p) => p.url === `/blog/${post.slug}`)!;
      expect(page.main.some((h) => h.startsWith("/blog/") && h !== page.url), `${post.slug}: another post`).toBe(true);
    }
  });

  it("every related link points at a page that exists", () => {
    const known = new Set([...pages.map((p) => p.url), ...guides.map((g) => g.url)]);
    for (const post of POSTS) for (const [, href] of post.related) expect(known.has(href), `${post.slug} → ${href}`).toBe(true);
  });
});

describe("guides", () => {
  it("each links its hub and at least three other guides in the main column", () => {
    const thin = guides.filter((g) => !g.main.includes("/cancel") || g.main.filter((h) => h.startsWith("/cancel/") && h !== g.url).length < 3).map((g) => g.url);
    expect(thin).toEqual([]);
  });
});

describe("landing and compare pages", () => {
  it("each links at least three other pages of the site from its main column", () => {
    const thin = pages.filter((p) => landingPaths.includes(p.url) || p.url.startsWith("/compare/")).filter((p) => p.main.filter((h) => h !== p.url).length < 3).map((p) => `${p.url}: ${p.main.join(" ")}`);
    expect(thin).toEqual([]);
  });
});

describe("no orphans", () => {
  it("every top-level page is linked from another page's main column", () => {
    const inbound = new Map<string, number>();
    for (const p of pages) for (const h of p.main) if (h !== p.url) inbound.set(h, (inbound.get(h) ?? 0) + 1);
    const orphans = pages.map((p) => p.url).filter((u) => u !== "/" && !inbound.get(u));
    expect(orphans).toEqual([]);
  });
});
