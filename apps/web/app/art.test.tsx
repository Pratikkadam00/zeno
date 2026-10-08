// @vitest-environment jsdom
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { OG_PAGES, ogImageFor, ogSlug } from "@/lib/og-pages";
import { listPages, parse, renderPage } from "@/test-support/pages";
import { POSTS, fillFigures } from "./blog/posts";

// W4.8 (docs/WEB_PLAN.md): every picture on the site is ours, drawn by
// scripts/site-art.ts, present at both sizes, small, and described. Every page
// in the sitemap has its own share card, whose title is the page's own h1.

vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (rel: string) => resolve(WEB, "public", rel.replace(/^\//, ""));
const KB = 1024;

const pictures = POSTS.flatMap((post) => [post.hero, ...post.sections.flatMap((s) => (s.figure ? [s.figure] : []))].map((p) => ({ post: post.slug, ...p })));

describe("the blog's pictures", () => {
  it("every post has a hero and at least one figure, each with alt text that describes it", () => {
    for (const post of POSTS) {
      expect(post.hero.art, post.slug).toMatch(/^[a-z0-9-]+$/);
      expect(post.sections.some((s) => s.figure), `${post.slug} has a figure`).toBe(true);
    }
    for (const p of pictures) expect(p.alt.split(/\s+/).length, `${p.post}/${p.art} alt`).toBeGreaterThanOrEqual(10);
  });

  it("each picture exists at 1200 and 600 wide, as WebP under 120 KB, with its SVG source beside it", async () => {
    for (const p of pictures) {
      for (const file of [`/art/${p.art}.webp`, `/art/${p.art}-600.webp`, `/art/${p.art}.svg`]) {
        expect(statSync(pub(file)).size, file).toBeLessThan(120 * KB);
      }
      const big = await sharp(pub(`/art/${p.art}.webp`)).metadata();
      const small = await sharp(pub(`/art/${p.art}-600.webp`)).metadata();
      expect([p.art, big.width, small.width, big.format]).toEqual([p.art, 1200, 600, "webp"]);
    }
  });

  it("no picture is the same drawing used twice as a hero", () => {
    const heroes = POSTS.map((p) => p.hero.art);
    expect(new Set(heroes).size).toBe(heroes.length);
  });

  it("the SVG sources carry no external reference (no link, no image, no script: everything is drawn here)", () => {
    for (const p of pictures) {
      const svg = readFileSync(pub(`/art/${p.art}.svg`), "utf8");
      expect(svg, p.art).not.toMatch(/<image|href=|<script|url\(/i);
    }
  });
});

describe("share cards", () => {
  let h1s: Record<string, string> = {};
  beforeAll(async () => {
    h1s = {};
    for (const p of listPages().filter((p) => !p.route.includes("[") && p.route !== "/analytics")) {
      const doc = parse((await renderPage(p)).html);
      // Compared without spaces: the home page's h1 is two sentences in two spans with no space between them.
      h1s[p.route] = (doc.querySelector("h1")?.textContent ?? "").replace(/\s+/g, "");
    }
  }, 60_000);

  it("every page in the table exists, and its card's title is the page's own h1", () => {
    for (const [path, card] of Object.entries(OG_PAGES)) {
      expect(h1s[path], path).toBeDefined();
      expect(h1s[path], path).toBe(card.title.replace(/\s+/g, ""));
    }
  });

  it("every top-level page and every post has its own card file, 1200 by 630", async () => {
    const paths = [...Object.keys(h1s).filter((r) => !r.startsWith("/blog/")), ...POSTS.map((p) => `/blog/${p.slug}`)];
    for (const path of paths) {
      const url = ogImageFor(path);
      expect(url, path).toBe(`/og/${ogSlug(path)}.png`);
      const meta = await sharp(pub(url!)).metadata();
      expect([path, meta.width, meta.height], path).toEqual([path, 1200, 630]);
      expect(statSync(pub(url!)).size, path).toBeLessThan(120 * KB);
    }
  });

  it("a post's card carries the post's title as rendered (figures filled), so the generator and the page agree", () => {
    // The generator renders POSTS' titles through the same fillFigures; a
    // token left in a title would reach the card as "{TOKEN}".
    for (const post of POSTS) expect(fillFigures(post.title)).not.toMatch(/\{[A-Z_]+\}/);
  });
});
