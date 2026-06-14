import type { MetadataRoute } from "next";

const BASE = "https://zeno.app";

export default function robots(): MetadataRoute.Robots {
  return {
    // Note: /analytics is excluded from indexing via page-level `noindex`
    // metadata (not disallowed here), so crawlers can still read that directive.
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE
  };
}
