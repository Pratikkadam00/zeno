import { describe, expect, it } from "vitest";
import { OG_PAGES, ogImageFor, ogSlug } from "./og-pages";
import { OG_IMAGE, pageMetadata } from "./seo";

// W4: the share-card table and the two helpers the metadata builder relies on.

describe("ogSlug", () => {
  it("names the home page 'home' and flattens nested paths with hyphens", () => {
    expect(ogSlug("/")).toBe("home");
    expect(ogSlug("/compare")).toBe("compare");
    expect(ogSlug("/compare/no-bank-login")).toBe("compare-no-bank-login");
    expect(ogSlug("/blog/the-20-minute-subscription-audit")).toBe("blog-the-20-minute-subscription-audit");
  });
});

describe("ogImageFor", () => {
  it("gives every page in the table, and every post, its own card", () => {
    for (const path of Object.keys(OG_PAGES)) expect(ogImageFor(path), path).toBe(`/og/${ogSlug(path)}.png`);
    expect(ogImageFor("/blog/any-post")).toBe("/og/blog-any-post.png");
  });

  it("gives a page outside the table no card of its own (it shares the site-wide one)", () => {
    expect(ogImageFor("/cancel/netflix")).toBeNull();
    expect(ogImageFor("/analytics")).toBeNull();
  });
});

describe("pageMetadata and the cards", () => {
  it("uses the page's own card when it has one, and the site-wide card otherwise", () => {
    const own = pageMetadata({ title: "About", description: "d".repeat(150), path: "/about" });
    expect(own.openGraph?.images).toEqual([{ url: "/og/about.png", width: 1200, height: 630, alt: "About | Zeno" }]);
    const shared = pageMetadata({ title: "How to cancel Netflix", description: "d".repeat(150), path: "/cancel/netflix" });
    expect(shared.openGraph?.images).toEqual([{ ...OG_IMAGE, alt: "How to cancel Netflix | Zeno" }]);
  });

  it("every card in the table has a title and an eyebrow, and no two paths share a slug", () => {
    const slugs = Object.keys(OG_PAGES).map(ogSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const [path, card] of Object.entries(OG_PAGES)) {
      expect(card.title.length, path).toBeGreaterThan(5);
      expect(card.eyebrow.length, path).toBeGreaterThan(2);
    }
  });
});
