// @vitest-environment jsdom
import { ORG_ID } from "@/lib/seo";
import { services } from "@zeno/service-catalog";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { siteUrl } from "@/lib/site";
import { jsonLd, listPages, parse } from "@/test-support/pages";
import BlogIndexPage from "./page";
import BlogPostPage, { dynamicParams, generateMetadata, generateStaticParams } from "./[slug]/page";
import { POSTS, fillFigures, findPost, postText, readingMinutes } from "./posts";

type Rendered = { slug: string; doc: Document; meta: Awaited<ReturnType<typeof generateMetadata>> };
const props = (slug: string) => ({ params: Promise.resolve({ slug }) });
let posts: Rendered[] = [];

beforeAll(async () => {
  posts = await Promise.all(
    POSTS.map(async (p) => ({ slug: p.slug, doc: parse(renderToStaticMarkup(await BlogPostPage(props(p.slug)))), meta: await generateMetadata(props(p.slug)) }))
  );
});

// The same rails as app/truthfulness.test.tsx, which renders only the first
// post of the [slug] route; every post is held to them here.
const BANNED: RegExp[] = [
  /100\s*%\s*on[- ]?device/i,
  /we never see your data/i,
  /(automatic(ally)?\s+(discover|detect|find|scan)\w*|(discover|detect|find|scan)\w*\s+automatically|(scans?|discovery|finds?)\s+in the background)/i,
  /no plaid,?\s+ever|never (use|touch) plaid/i,
  /\$\s?219\s*(\/\s*(yr|year)|(a|per) year)/i,
  /real cancellation (flow|steps)|statement shows no charge|until the charge actually stops/i,
  /most popular/i
];

describe("the blog's posts", () => {
  it("are built for every post, each slug once, and only those (an unknown slug is the 404)", () => {
    expect(generateStaticParams()).toEqual(POSTS.map((p) => ({ slug: p.slug })));
    expect(new Set(POSTS.map((p) => p.slug)).size).toBe(POSTS.length);
    expect(dynamicParams).toBe(false);
    expect(findPost("not-a-post")).toBeUndefined();
  });

  it("each is dated (a real day, not in the future), at least 600 words, with a lead and three or more sections", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const post of POSTS) {
      expect([post.slug, /^\d{4}-\d{2}-\d{2}$/.test(post.date) && post.date <= today]).toEqual([post.slug, true]);
      const words = fillFigures(postText(post)).split(/\s+/).filter(Boolean).length;
      expect([post.slug, words]).toEqual([post.slug, expect.any(Number)]);
      expect(words, post.slug).toBeGreaterThanOrEqual(600);
      expect(post.sections.length, post.slug).toBeGreaterThanOrEqual(3);
      expect(post.lead.length, post.slug).toBeGreaterThan(40);
    }
  });

  it("each: its own title, description and canonical, as an article with a social card and a published date", () => {
    for (const { slug, meta } of posts) {
      const post = findPost(slug)!;
      expect(meta.title).toEqual({ absolute: `${post.title} | Zeno` });
      expect(meta.description).toBe(post.description);
      expect(meta.alternates?.canonical).toBe(`/blog/${slug}`);
      expect((meta.openGraph as { type?: string }).type).toBe("article");
      expect((meta.openGraph as { publishedTime?: string }).publishedTime).toBe(`${post.date}T00:00:00.000Z`);
    }
    expect(new Set(posts.map((p) => JSON.stringify(p.meta.title))).size).toBe(posts.length);
    expect(new Set(posts.map((p) => String(p.meta.description))).size).toBe(posts.length);
  });

  it("each renders its lead, every section heading and paragraph, with the catalog's figures filled in", () => {
    for (const { slug, doc } of posts) {
      const post = findPost(slug)!;
      const text = doc.querySelector("main")!.textContent ?? "";
      expect(doc.querySelector("h1")!.textContent).toBe(post.title);
      expect(text).toContain(fillFigures(post.lead));
      for (const section of post.sections) {
        if (section.heading) expect([slug, [...doc.querySelectorAll("h2")].map((h) => h.textContent)]).toEqual([slug, expect.arrayContaining([section.heading])]);
        for (const paragraph of section.paragraphs) expect([slug, text.includes(fillFigures(paragraph))]).toEqual([slug, true]);
      }
      expect(text).not.toMatch(/\{SERVICE_COUNT\}|\{HARD_COUNT\}/);
      if (postText(post).includes("{SERVICE_COUNT}")) expect(text).toContain(`${services.length} services`);
    }
  });

  it("each carries BlogPosting structured data matching the post, and a Home > Blog > post breadcrumb", () => {
    for (const { slug, doc } of posts) {
      const post = findPost(slug)!;
      const blocks = jsonLd(doc);
      const article = blocks.find((b) => b["@type"] === "BlogPosting") as Record<string, unknown>;
      expect(article).toMatchObject({
        headline: post.title,
        description: post.description,
        datePublished: `${post.date}T00:00:00.000Z`,
        // The site's one Organization, by reference (lib/structured-data.ts).
        author: { "@id": ORG_ID },
        publisher: { "@id": ORG_ID },
        mainEntityOfPage: { "@id": siteUrl(`/blog/${slug}`) }
      });
      expect(article.wordCount).toBeGreaterThanOrEqual(600);
      const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList") as { itemListElement: { name: string; item: string }[] };
      expect(crumbs.itemListElement.map((c) => c.item)).toEqual([siteUrl("/"), siteUrl("/blog"), siteUrl(`/blog/${slug}`)]);
    }
  });

  it("every post keeps the truthfulness rails, and the page says 'No bank login required' (the footer carries it, as on every page)", () => {
    for (const { slug, doc } of posts) {
      const text = doc.querySelector("main")!.textContent ?? "";
      for (const pattern of BANNED) expect([slug, text.match(pattern)?.[0] ?? null]).toEqual([slug, null]);
      expect([slug, (doc.documentElement.textContent ?? "").includes("No bank login required")]).toEqual([slug, true]);
    }
  });

  it("every internal link in a post goes to a page that exists, and each post links to the others", () => {
    const routes = new Set(listPages().flatMap((p) => (p.route.includes("[slug]") ? [] : [p.route])));
    for (const s of services) routes.add(`/cancel/${s.slug}`);
    for (const p of POSTS) routes.add(`/blog/${p.slug}`);
    for (const { slug, doc } of posts) {
      const hrefs = [...doc.querySelectorAll("main a[href^='/']")].map((a) => a.getAttribute("href")!.split("#")[0]!);
      const dead = hrefs.filter((h) => !routes.has(h));
      expect([slug, dead]).toEqual([slug, []]);
      for (const other of POSTS.filter((p) => p.slug !== slug)) expect([slug, hrefs]).toEqual([slug, expect.arrayContaining([`/blog/${other.slug}`])]);
    }
  });
});

describe("edges", () => {
  it("an unknown slug is a 404, with a 'not found' title rather than a made-up post", async () => {
    await expect(BlogPostPage(props("no-such-post"))).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    const meta = await generateMetadata(props("no-such-post"));
    expect(meta.title).toEqual({ absolute: "Post not found | Zeno" });
    expect(meta.alternates).toBeUndefined();
  });

  it("with a single post there is no 'More from the blog' section", async () => {
    vi.resetModules();
    vi.doMock("./posts", async () => {
      const real = await vi.importActual<typeof import("./posts")>("./posts");
      return { ...real, POSTS: [real.POSTS[0]!] };
    });
    const { default: OnlyPostPage } = await import("./[slug]/page");
    const doc = parse(renderToStaticMarkup(await OnlyPostPage(props(POSTS[0]!.slug))));
    expect([...doc.querySelectorAll("h2")].map((h) => h.textContent)).not.toContain("More from the blog");
    vi.doUnmock("./posts");
    vi.resetModules();
  });
});

describe("the blog index", () => {
  it("lists every post, newest first, each with its date and description", () => {
    const doc = parse(renderToStaticMarkup(BlogIndexPage()));
    const links = [...doc.querySelectorAll("main ul a")].map((a) => a.getAttribute("href"));
    const sorted = [...POSTS].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).map((p) => `/blog/${p.slug}`);
    expect(links).toEqual(sorted);
    const text = doc.querySelector("main")!.textContent ?? "";
    for (const post of POSTS) {
      expect(text).toContain(post.description);
      expect(text).toContain(`${readingMinutes(post)} min read`);
    }
    expect([...doc.querySelectorAll("time")].map((t) => t.getAttribute("dateTime"))).toEqual(sorted.map((href) => POSTS.find((p) => `/blog/${p.slug}` === href)!.date));
  });
});
