import { LANDINGS } from "@/lib/landings";
import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";
import { isGeneralCancelGuide, services } from "@zeno/service-catalog";
import { INDEX_GENERAL_GUIDES } from "@/lib/guides";
import { POSTS } from "./blog/posts";

const BASE = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  // A real content date, never the build time (SEO.md §7.1: a build-time date
  // on every URL teaches Google to ignore lastmod). 2026-10-05: every page's
  // title and description were rewritten. Give a page its own date when only
  // its content changes.
  const lastModified = new Date("2026-10-05");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    // The hub for the ~600 cancel/[slug] guides below — the biggest owned SEO
    // asset was previously orphaned with no index page (Phase 4.3).
    // The landing pages, one buying intent each (lib/landings.ts; SEO.md §7.1: 0.9).
    ...LANDINGS.map((l) => ({ url: `${BASE}${l.path}`, lastModified, changeFrequency: "monthly" as const, priority: 0.9 })),
    { url: `${BASE}/cancel`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: new Date(POSTS.map((p) => p.date).sort().at(-1)!), changeFrequency: "weekly", priority: 0.7 },
    // /analytics is deliberately excluded: it's noindex'd (see app/analytics/
    // layout.tsx's robots metadata) and, by default, 404s in production unless
    // SHOW_PUBLIC_ANALYTICS=1 — a sitemap should never list a noindex'd URL.
    // D20 (2026-10-08): one roadmap page replaced five planned-feature pages; /about is new.
    { url: `${BASE}/roadmap`, lastModified: new Date("2026-10-08"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/about`, lastModified: new Date("2026-10-08"), changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/press`, lastModified: new Date("2026-10-09"), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/features`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/family-vault`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/spend-twin`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/legal/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/cookies`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    // Complaint-language comparison pages (Phase 4.4).
    { url: `${BASE}/compare`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/compare/no-bank-login`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/compare/budget-app-no-bank-sync`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/compare/rocket-money-alternative`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/compare/monarch-alternative`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/compare/ynab-alternative`, lastModified, changeFrequency: "monthly", priority: 0.7 }
  ];

  // The cancellation guides are the largest indexable surface — one per service.
  // Guides with steps written for their service rank above the general ones
  // (the same five steps with the name filled in, F171); whether the general
  // ones are listed at all is D16 (apps/web/lib/guides.ts).
  const cancelRoutes: MetadataRoute.Sitemap = services
    .filter((service) => INDEX_GENERAL_GUIDES || !isGeneralCancelGuide(service.name, service.cancelGuide))
    .map((service) => ({
      url: `${BASE}/cancel/${service.slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: isGeneralCancelGuide(service.name, service.cancelGuide) ? 0.5 : 0.8
    }));

  const blogRoutes: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [...staticRoutes, ...blogRoutes, ...cancelRoutes];
}
