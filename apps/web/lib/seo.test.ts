import { describe, expect, it } from "vitest";
import { guideDescription } from "./guides";
import { APP_ID, ORG_ID, WEBSITE_ID, fullTitle, pageMetadata } from "./seo";
import { SITE_URL, siteUrl } from "./site";
import { APP_OFFERS, appNode, siteGraph } from "./structured-data";

// The helpers behind every page's metadata and structured data. Every page is
// held to them in apps/web/app/seo.test.tsx (the website's own test run); these
// pin the helpers themselves in the logic run.

describe("pageMetadata", () => {
  it("builds the whole set from one title, description and path", () => {
    expect(pageMetadata({ title: "Compare", description: "d", path: "/compare" })).toEqual({
      title: { absolute: "Compare | Zeno" },
      description: "d",
      alternates: { canonical: "/compare" },
      openGraph: {
        title: "Compare | Zeno",
        description: "d",
        url: siteUrl("/compare"),
        siteName: "Zeno",
        locale: "en_US",
        type: "website",
        images: [{ url: "/og.png", width: 1200, height: 630, alt: "Compare | Zeno" }]
      },
      twitter: {
        card: "summary_large_image",
        title: "Compare | Zeno",
        description: "d",
        images: [{ url: "/og.png", width: 1200, height: 630, alt: "Compare | Zeno" }]
      }
    });
  });

  it("an article carries its dates; robots and extra alternates pass through", () => {
    const meta = pageMetadata({
      title: "Post",
      description: "d",
      path: "/blog/post",
      type: "article",
      publishedTime: "2026-10-04T00:00:00.000Z",
      modifiedTime: "2026-10-05T00:00:00.000Z",
      robots: { index: false, follow: true },
      alternates: { types: { "application/rss+xml": "/blog/feed.xml" } }
    });
    expect(meta.openGraph).toMatchObject({ type: "article", publishedTime: "2026-10-04T00:00:00.000Z", modifiedTime: "2026-10-05T00:00:00.000Z" });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates).toEqual({ canonical: "/blog/post", types: { "application/rss+xml": "/blog/feed.xml" } });
  });

  it("a page without dates or robots has none", () => {
    const meta = pageMetadata({ title: "T", description: "d", path: "/" });
    expect(meta.openGraph).not.toHaveProperty("publishedTime");
    expect(meta.openGraph).not.toHaveProperty("modifiedTime");
    expect(meta).not.toHaveProperty("robots");
  });

  it("adds the brand once, at the end", () => {
    expect(fullTitle("How to cancel Netflix")).toBe("How to cancel Netflix | Zeno");
  });
});

describe("structured data", () => {
  it("the site graph: Organization and WebSite with stable ids and the square logo", () => {
    expect(siteGraph()).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        expect.objectContaining({ "@type": "Organization", "@id": ORG_ID, name: "Zeno", url: SITE_URL, logo: siteUrl("/apple-icon.png") }),
        { "@type": "WebSite", "@id": WEBSITE_ID, name: "Zeno", url: SITE_URL, inLanguage: "en", publisher: { "@id": ORG_ID } }
      ]
    });
    expect(ORG_ID).toBe(`${SITE_URL}/#org`);
  });

  it("the app: a finance app with one pre-order offer per visible price", () => {
    const node = appNode();
    expect(node).toMatchObject({ "@type": "SoftwareApplication", "@id": APP_ID, applicationCategory: "FinanceApplication", operatingSystem: "iOS, Android", publisher: { "@id": ORG_ID } });
    expect(node.offers).toEqual(APP_OFFERS.map((offer) => ({ "@type": "Offer", name: offer.name, price: offer.price, priceCurrency: "USD", availability: "https://schema.org/PreOrder" })));
  });
});

describe("guideDescription", () => {
  it("takes the longest wording that fits 160 characters", () => {
    // A short name fits the longest wording; Netflix at "medium" is one character
    // over it (161), so the next one is used.
    expect(guideDescription("Max", "easy", false)).toBe(
      "Step-by-step guide to cancel your Max subscription (difficulty: easy), with a direct link to the cancellation page, so you can stop before the next charge."
    );
    expect(guideDescription("Netflix", "medium", false)).toBe(
      "Step-by-step guide to cancel your Netflix subscription (difficulty: medium), with a direct link to the cancellation page when one is available."
    );
    expect(guideDescription("Max", "easy", true)).toBe(
      "General steps to cancel your Max subscription (difficulty: easy), with a direct link to Max's cancellation page. We haven't verified Max's exact flow yet."
    );
    for (const text of [guideDescription("Max", "easy", false), guideDescription("Netflix", "medium", false), guideDescription("Max", "easy", true)]) {
      expect(text.length).toBeLessThanOrEqual(160);
    }
  });

  it("falls back to the shortest wording for a name too long for any", () => {
    const name = "A".repeat(80);
    expect(guideDescription(name, "hard", true)).toBe(`General steps to cancel ${name} (difficulty: hard), with a direct link to its cancellation page. We haven't verified the exact flow yet.`);
    expect(guideDescription(name, "hard", false)).toBe(`Step-by-step guide to cancel your ${name} subscription (difficulty: hard), with a direct link to the cancellation page when available.`);
  });
});
