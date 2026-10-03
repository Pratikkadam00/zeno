// @vitest-environment jsdom
import { services } from "@zeno/service-catalog";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { siteUrl } from "@/lib/site";
import { jsonLd, listPages, parse, renderPage, type PageFile } from "@/test-support/pages";

// next/font is compiled by Next itself; the root layout's metadata is what
// these tests need from it, not its font files.
vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

const PAGES = listPages();
const FIRST_SLUG = services[0]!.slug;
const NOINDEX = new Set(["/analytics"]);
const urlOf = (p: PageFile) => p.route.replace("[slug]", FIRST_SLUG);
const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public") + "/";

type Rendered = { page: PageFile; url: string; doc: Document; metadata: Awaited<ReturnType<typeof renderPage>>["metadata"] };
let rendered: Rendered[] = [];

beforeAll(async () => {
  // The sample analytics page exists only behind its flag; render it with the flag on.
  vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
  rendered = await Promise.all(
    PAGES.map(async (p) => {
      const { html, metadata } = await renderPage(p, p.route.includes("[slug]") ? { slug: FIRST_SLUG } : {});
      return { page: p, url: urlOf(p), doc: parse(html), metadata };
    })
  );
  vi.unstubAllEnvs();
});

// Every route the site serves (the 509 guides expanded), for the link check.
const ROUTES = new Set(PAGES.flatMap((p) => (p.route === "/cancel/[slug]" ? services.map((s) => `/cancel/${s.slug}`) : [p.route])));

describe("the page list itself", () => {
  it("finds every page on disk (24 routes today, the guides as one)", () => {
    expect(PAGES.map((p) => p.route)).toEqual([
      "/",
      "/analytics",
      "/cancel",
      "/cancel/[slug]",
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
    ]);
  });
});

describe("every page", () => {
  it("has a title and a description of its own (no two pages share either)", () => {
    const titles = rendered.map((r) => String(r.metadata.title ?? ""));
    const descriptions = rendered.map((r) => String(r.metadata.description ?? ""));
    for (const [i, r] of rendered.entries()) {
      expect([r.url, titles[i]!.length > 0, descriptions[i]!.length > 0]).toEqual([r.url, true, true]);
    }
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("indexable pages: canonical is the page's own path, with a social card title; the noindex page says noindex", () => {
    for (const r of rendered) {
      if (NOINDEX.has(r.page.route)) {
        expect(r.metadata.robots).toEqual({ index: false, follow: false });
        continue;
      }
      expect([r.url, r.metadata.alternates?.canonical]).toEqual([r.url, r.url]);
      expect([r.url, typeof r.metadata.openGraph?.title]).toEqual([r.url, "string"]);
      const robots = r.metadata.robots as { index?: boolean } | undefined;
      expect([r.url, robots?.index ?? true]).toEqual([r.url, true]);
    }
  });

  it("has exactly one h1", () => {
    for (const r of rendered) expect([r.url, r.doc.querySelectorAll("h1").length]).toEqual([r.url, 1]);
  });

  it("has the main#main the 'Skip to content' link jumps to, exactly once", () => {
    const missing = rendered.filter((r) => r.doc.querySelectorAll("#main").length !== 1 || r.doc.querySelector("#main")!.tagName !== "MAIN").map((r) => r.url);
    expect(missing).toEqual([]);
  });

  it("every JSON-LD block parses; every breadcrumb trail starts at Home and ends at this page", () => {
    for (const r of rendered) {
      const blocks = jsonLd(r.doc);
      for (const block of blocks) expect([r.url, block["@context"]]).toEqual([r.url, "https://schema.org"]);
      for (const crumbs of blocks.filter((b) => b["@type"] === "BreadcrumbList")) {
        const items = crumbs.itemListElement as { position: number; name: string; item: string }[];
        expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1));
        expect(items[0]).toMatchObject({ name: "Home", item: siteUrl("/") });
        expect([r.url, items.at(-1)!.item]).toEqual([r.url, siteUrl(r.url)]);
        for (const item of items) expect(item.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("every internal link goes to a page that exists (or a file in public/)", () => {
    const dead: string[] = [];
    for (const r of rendered) {
      for (const a of r.doc.querySelectorAll("a[href^='/']")) {
        const path = a.getAttribute("href")!.split("#")[0]!.split("?")[0]!;
        if (!ROUTES.has(path || "/") && !existsSync(PUBLIC_DIR + path.slice(1))) dead.push(`${r.url} -> ${a.getAttribute("href")}`);
      }
    }
    expect(dead).toEqual([]);
  });

  it("every link that opens a new tab says noopener noreferrer", () => {
    for (const r of rendered) {
      for (const a of r.doc.querySelectorAll("a[target='_blank']")) expect([r.url, a.getAttribute("rel")]).toEqual([r.url, "noopener noreferrer"]);
    }
  });
});

describe("the sitemap and robots.txt", () => {
  it("the sitemap lists exactly the indexable pages, every guide included, as absolute URLs", async () => {
    const { default: sitemap } = await import("./sitemap");
    const listed = sitemap().map((e) => e.url);
    const expected = [...ROUTES].filter((r) => !NOINDEX.has(r)).map((r) => siteUrl(r));
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual([...expected].sort());
  });

  it("robots allows everything and points at the sitemap", async () => {
    const { default: robots } = await import("./robots");
    expect(robots()).toEqual({ rules: [{ userAgent: "*", allow: "/" }], sitemap: siteUrl("/sitemap.xml"), host: siteUrl("/").replace(/\/$/, "") });
  });
});
