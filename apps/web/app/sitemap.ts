import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";
import { isGeneralCancelGuide, services } from "@zeno/service-catalog";
import { INDEX_GENERAL_GUIDES } from "@/lib/guides";
import { POSTS } from "./blog/posts";

const BASE = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-13");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    // The hub for the ~600 cancel/[slug] guides below — the biggest owned SEO
    // asset was previously orphaned with no index page (Phase 4.3).
    { url: `${BASE}/cancel`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: new Date(POSTS.map((p) => p.date).sort().at(-1)!), changeFrequency: "weekly", priority: 0.7 },
    // /analytics is deliberately excluded: it's noindex'd (see app/analytics/
    // layout.tsx's robots metadata) and, by default, 404s in production unless
    // SHOW_PUBLIC_ANALYTICS=1 — a sitemap should never list a noindex'd URL.
    { url: `${BASE}/developers`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/partners`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/features`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/business`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/family-vault`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/open-banking`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/spend-twin`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/widgets-watch`, lastModified, changeFrequency: "monthly", priority: 0.6 },
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
