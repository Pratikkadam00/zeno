import { SITE_URL, siteUrl } from "./site";
import { APP_ID, BRAND, HOME_DESCRIPTION, ORG_ID, WEBSITE_ID } from "./seo";

// The site's one entity graph (SEO.md §4): Organization and WebSite with stable
// @ids on every page, which page-level nodes point at (isPartOf, publisher)
// instead of declaring again. Honest values only: no rating, no review, no
// invented date (§4.3).

export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: BRAND,
        url: SITE_URL,
        // The square app icon (app/apple-icon.png), not the wide share banner.
        logo: siteUrl("/apple-icon.png"),
        description: HOME_DESCRIPTION
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: BRAND,
        url: SITE_URL,
        inLanguage: "en",
        publisher: { "@id": ORG_ID }
      }
    ]
  };
}

/**
 * The prices on the homepage's bill (components/site/sections.tsx, PLANS), which
 * match the in-app paywall. structured-data.test.ts fails if the visible bill and
 * these ever disagree (§4.3: schema prices must equal visible prices).
 */
export const APP_OFFERS = [
  { name: "Free", price: "0" },
  { name: "Pro, monthly", price: "3.99" },
  { name: "Pro, yearly", price: "29.99" },
  { name: "Lifetime", price: "79.99" },
  { name: "Family, monthly", price: "6.99" }
] as const;

/** The app itself, on the homepage. Pre-launch, so every offer is a pre-order. */
export function appNode() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: BRAND,
    url: SITE_URL,
    description: HOME_DESCRIPTION,
    applicationCategory: "FinanceApplication",
    operatingSystem: "iOS, Android",
    publisher: { "@id": ORG_ID },
    offers: APP_OFFERS.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price,
      priceCurrency: "USD",
      availability: "https://schema.org/PreOrder"
    }))
  };
}
