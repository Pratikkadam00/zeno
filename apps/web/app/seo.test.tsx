// @vitest-environment jsdom
import { isGeneralCancelGuide, serviceRecords, services } from "@zeno/service-catalog";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Metadata } from "next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAQS } from "@/components/site/faq-data";
import { guideDescription } from "@/lib/guides";
import { DESCRIPTION_MAX, DESCRIPTION_MIN, ORG_ID, TITLE_MAX, WEBSITE_ID } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { APP_OFFERS, appNode, siteGraph } from "@/lib/structured-data";
import { listPages, renderPage, type PageFile } from "@/test-support/pages";
import { POSTS } from "./blog/posts";
import { GET as feed } from "./blog/feed.xml/route";
import sitemap from "./sitemap";

// SEO.md §9 (definition of done) as tests: every indexable page's title, its
// description, its canonical and its share cards, the one entity graph, the
// feed, llms.txt and the prices, so a new page or an edited one cannot drift.

vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

const NOINDEX = new Set(["/analytics"]);
const titleOf = (m: Metadata) => (typeof m.title === "object" && m.title && "absolute" in m.title ? m.title.absolute : m.title) as string;

type Checked = { route: string; metadata: Metadata };
let pages: Checked[] = [];

beforeAll(async () => {
  const files = listPages().filter((p: PageFile) => !NOINDEX.has(p.route) && !p.route.includes("[slug]"));
  pages = await Promise.all(files.map(async (p) => ({ route: p.route, metadata: (await renderPage(p)).metadata })));
});

function expectSeo(route: string, m: Metadata) {
  const title = titleOf(m);
  const description = m.description ?? "";
  expect(title, route).toMatch(/ \| Zeno$/);
  expect(title.length, `${route} title "${title}"`).toBeLessThanOrEqual(TITLE_MAX);
  expect(title, route).not.toMatch(/\| Zeno.*\| Zeno/);
  expect(description.length, `${route} description "${description}"`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
  expect(description.length, `${route} description "${description}"`).toBeLessThanOrEqual(DESCRIPTION_MAX);
  expect(m.alternates?.canonical, route).toBe(route);
  // Its own share cards, never the site-wide ones (Next merges shallowly).
  const og = m.openGraph as Record<string, unknown>;
  const tw = m.twitter as Record<string, unknown>;
  expect(og.title, route).toBe(title);
  expect(og.description, route).toBe(description);
  expect(og.url, route).toBe(siteUrl(route));
  expect(tw.card, route).toBe("summary_large_image");
  expect(tw.title, route).toBe(title);
  expect(tw.description, route).toBe(description);
  for (const images of [og.images, tw.images] as Array<Array<{ url: string; alt: string }>>) {
    expect(images, route).toEqual([expect.objectContaining({ url: "/og.png", alt: title })]);
  }
}

describe("every indexable page's metadata (SEO.md §3)", () => {
  it("covers the pages on disk", () => {
    expect(pages.length).toBeGreaterThanOrEqual(20);
  });

  it("titles at most 60 characters ending '| Zeno' once; descriptions 140 to 160; self-canonical; its own Open Graph and Twitter cards", () => {
    for (const { route, metadata } of pages) expectSeo(route, metadata);
  });

  it("every one of the 509 guides, through its own metadata function", async () => {
    const { generateMetadata } = await import("./cancel/[slug]/page");
    expect(serviceRecords).toHaveLength(services.length);
    for (const service of serviceRecords) {
      expectSeo(`/cancel/${service.slug}`, await generateMetadata({ params: Promise.resolve({ slug: service.slug }) }));
    }
  });

  it("every blog post, as an article with its real publish date", async () => {
    const { generateMetadata } = await import("./blog/[slug]/page");
    for (const post of POSTS) {
      const m = await generateMetadata({ params: Promise.resolve({ slug: post.slug }) });
      expectSeo(`/blog/${post.slug}`, m);
      expect(m.openGraph).toMatchObject({ type: "article", publishedTime: `${post.date}T00:00:00.000Z` });
    }
  });

  it("no two indexable pages share a title or a description", () => {
    const titles = pages.map((p) => titleOf(p.metadata));
    const descriptions = pages.map((p) => p.metadata.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("a guide's description never claims more than its page: general guides say they are unverified", () => {
    for (const service of serviceRecords) {
      const general = isGeneralCancelGuide(service.name, service.cancellationGuideSteps);
      const text = guideDescription(service.name, service.cancellationDifficulty.replace("_", " "), general);
      expect(text.startsWith(general ? "General steps" : "Step-by-step guide"), service.name).toBe(true);
      if (general) expect(text, service.name).toContain("haven't verified");
    }
  });
});

describe("structured data (SEO.md §4)", () => {
  it("one Organization and one WebSite with stable ids, the site referring to its publisher", () => {
    const graph = siteGraph()["@graph"];
    expect(graph.map((node) => [node["@type"], node["@id"]])).toEqual([
      ["Organization", ORG_ID],
      ["WebSite", WEBSITE_ID]
    ]);
    expect(graph[1]).toMatchObject({ publisher: { "@id": ORG_ID } });
  });

  it("the app's prices are exactly the ones the homepage shows, every one a pre-order, and no rating or review", () => {
    const pricing = FAQS.find((f) => f.q === "What will it cost?")!.a;
    for (const offer of APP_OFFERS) {
      if (offer.price === "0") expect(pricing).toContain("Free forever");
      else expect(pricing, offer.name).toContain(`$${offer.price}`);
    }
    const node = appNode();
    expect(node.applicationCategory).toBe("FinanceApplication");
    expect(node.offers.every((o) => o.availability === "https://schema.org/PreOrder" && o.priceCurrency === "USD")).toBe(true);
    expect(JSON.stringify(node)).not.toMatch(/aggregateRating|"review"/);
  });
});

describe("the RSS feed (SEO.md §7.3)", () => {
  it("lists every post, newest first, with its real date and its canonical link", async () => {
    const response = feed();
    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    const xml = await response.text();
    const links = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<pubDate>([^<]+)<\/pubDate>/g)];
    const newestFirst = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
    expect(links.map((m) => m[1])).toEqual(newestFirst.map((p) => siteUrl(`/blog/${p.slug}`)));
    expect(links.map((m) => m[2])).toEqual(newestFirst.map((p) => new Date(`${p.date}T00:00:00.000Z`).toUTCString()));
  });

  it("the blog index advertises it", () => {
    const blog = pages.find((p) => p.route === "/blog")!;
    expect(blog.metadata.alternates?.types).toEqual({ "application/rss+xml": "/blog/feed.xml" });
  });
});

describe("llms.txt (SEO.md §7.4)", () => {
  const text = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../public/llms.txt"), "utf8");

  it("links only pages the sitemap lists", () => {
    const listed = new Set(sitemap().map((entry) => entry.url));
    const linked = [...text.matchAll(/\]\((https:\/\/zenoapp\.in[^)]*)\)/g)].map((m) => m[1]!);
    expect(linked.length).toBeGreaterThan(10);
    for (const url of linked) expect(listed.has(url.replace("https://zenoapp.in", siteUrl("/").replace(/\/$/, ""))) || listed.has(`${url}/`), url).toBe(true);
  });

  it("states the real catalogue size and the real prices, and says no bank login is required", () => {
    expect(text).toContain(`a catalogue of ${services.length} services`);
    for (const offer of APP_OFFERS.filter((o) => o.price !== "0")) expect(text, offer.name).toContain(`$${offer.price}`);
    expect(text).toContain("No bank login required.");
  });

  it("makes none of the claims the product cannot back (truthfulness rules)", () => {
    expect(text).not.toMatch(/100% on-device|never see your data|automatic(ally)? (discover|find)|in the background,|most popular/i);
  });
});
