import type { Metadata } from "next";
import { SITE_URL, siteUrl } from "./site";
import { ogImageFor } from "./og-pages";

// One place that builds a page's search and share metadata (SEO.md §3), so every
// indexable page has the same complete set: a self-canonical URL, Open Graph AND
// Twitter blocks of its own (Next.js merges metadata shallowly: a page without its
// own `twitter` shows the site-wide card), and an image alt that names the page.
// seo.test.ts holds every page to the limits below.

export const BRAND = "Zeno";
/** Titles: keyword first, the brand last, at most 60 characters with the suffix. */
export const TITLE_MAX = 60;
/** Descriptions: 140 to 160 characters (shorter wastes the slot, longer is cut). */
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 160;

export const HOME_TITLE = "Subscription tracker: know what you pay";
export const HOME_DESCRIPTION =
  "Zeno finds your subscriptions in receipts and statements you control, warns you before each renewal, and walks you through cancelling. No bank login required.";

export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630 } as const;

/** The page's own share card (W4, scripts/site-art.ts) when it has one, else the site-wide one. */
export function ogImage(path: string) {
  return { ...OG_IMAGE, url: ogImageFor(path) ?? OG_IMAGE.url };
}

/** Stable ids of the site's one entity graph (SEO.md §4.1). */
export const ORG_ID = `${SITE_URL}/#org`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;

/** "How to cancel Netflix" becomes "How to cancel Netflix | Zeno". */
export function fullTitle(title: string): string {
  return `${title} | ${BRAND}`;
}

type PageMeta = {
  /** The page's own title WITHOUT the brand: the suffix is added here. */
  title: string;
  description: string;
  /** The page's path on the canonical host, e.g. "/blog". */
  path: string;
  type?: "website" | "article";
  /** For articles: ISO dates, shown on the page too. */
  publishedTime?: string;
  modifiedTime?: string;
  robots?: Metadata["robots"];
  alternates?: Omit<NonNullable<Metadata["alternates"]>, "canonical">;
};

export function pageMetadata(page: PageMeta): Metadata {
  const title = fullTitle(page.title);
  const url = siteUrl(page.path);
  const images = [{ ...ogImage(page.path), alt: title }];
  return {
    // absolute: the root layout sets no template, and the suffix is already here.
    title: { absolute: title },
    description: page.description,
    alternates: { ...page.alternates, canonical: page.path },
    openGraph: {
      title,
      description: page.description,
      url,
      siteName: BRAND,
      locale: "en_US",
      type: page.type ?? "website",
      ...(page.publishedTime ? { publishedTime: page.publishedTime } : {}),
      ...(page.modifiedTime ? { modifiedTime: page.modifiedTime } : {}),
      images
    },
    twitter: { card: "summary_large_image", title, description: page.description, images },
    ...(page.robots ? { robots: page.robots } : {})
  };
}
