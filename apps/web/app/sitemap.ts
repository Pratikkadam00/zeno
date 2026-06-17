import type { MetadataRoute } from "next";
import { services } from "@zeno/service-catalog";

const BASE = "https://zeno.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-13");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/analytics`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/developers`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/partners`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/features/business`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/family-vault`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/open-banking`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/spend-twin`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/features/widgets-watch`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/legal/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/cookies`, lastModified, changeFrequency: "yearly", priority: 0.3 }
  ];

  // The cancellation guides are the largest indexable surface — one per service.
  const cancelRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${BASE}/cancel/${service.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [...staticRoutes, ...cancelRoutes];
}
