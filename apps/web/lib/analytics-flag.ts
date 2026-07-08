// Single source of truth for whether the public /analytics demo dashboard is
// reachable. The route itself, the sitemap, and every nav/footer/CTA link to
// it must all agree — otherwise the site links to a page that 404s (or
// advertises a page the sitemap shouldn't have listed). Server-only (reads a
// non-NEXT_PUBLIC_ env var), so Client Component callers (Nav, AnalyticsTeaser)
// receive the result as a prop from a Server Component parent rather than
// evaluating this themselves.
export function isPublicAnalyticsEnabled(): boolean {
  // The dashboard renders synthetic sample KPIs. To avoid broadcasting
  // plausible-looking-but-fake business metrics publicly, it's hidden in
  // production unless explicitly opted in (SHOW_PUBLIC_ANALYTICS=1, e.g. for a
  // demo). Always available in development.
  return process.env.NODE_ENV !== "production" || process.env.SHOW_PUBLIC_ANALYTICS === "1";
}
