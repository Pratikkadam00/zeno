/**
 * The public origin of the marketing site — the ONE place the domain lives.
 *
 * A1 (the domain) lands here and nowhere else: set NEXT_PUBLIC_SITE_URL in the
 * deploy environment, or change DEFAULT_SITE_URL. Nothing else under apps/web
 * may spell the host out; scripts/site-url-guard.test.ts fails if a literal
 * creeps back in. NEXT_PUBLIC_ so server and client agree, and SSG bakes the
 * value into all 500+ pages at build time.
 */
const DEFAULT_SITE_URL = "https://zeno.app";

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  // Fail LOUD at module load — i.e. at build — on a malformed value, rather
  // than shipping hundreds of pages of broken canonical URLs and JSON-LD.
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be an http(s) origin, got: ${raw}`);
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be a bare origin with no path, got: ${raw}`);
  }
  return trimmed;
}

/** Absolute origin, no trailing slash. e.g. "https://zeno.app" */
export const SITE_URL: string = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);

/** Bare host, for prose and addresses. e.g. "zeno.app" */
export const SITE_HOST: string = new URL(SITE_URL).host;

/** Absolute URL for a site path. siteUrl("/cancel/netflix") → "https://zeno.app/cancel/netflix" */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Contact addresses derive from the host so they move with the domain. */
export const CONTACT_EMAIL = {
  privacy: `privacy@${SITE_HOST}`,
  legal: `legal@${SITE_HOST}`
} as const;
