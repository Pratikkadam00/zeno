import Constants from "expo-constants";

/**
 * The public website origin — the ONE place the domain lives on mobile.
 *
 * A1 (the domain) lands here and nowhere else: app.config.ts forwards
 * EXPO_PUBLIC_SITE_URL into `extra.siteUrl`, and this module applies the
 * default. Nothing else under apps/mobile may spell the host out;
 * scripts/site-url-guard.test.ts fails if a literal creeps back in.
 *
 * Same shape as src/api/config.ts's getApiBaseUrl(): read from expo config at
 * call time (so tests can mock it per case), imports no app code.
 */
// F238: this was "https://zeno.app" — a domain Zeno does not own, parked and
// for sale. A release built without EXPO_PUBLIC_SITE_URL pointed its Terms and
// Privacy links, its share signature and its feedback address at that stranger's
// page; opening Terms on the emulator landed on a GoDaddy sale listing. The
// default is now the real domain, so a missing variable degrades to correct.
const DEFAULT_SITE_URL = "https://zenoapp.in";

/** Absolute origin, no trailing slash. */
export function getSiteUrl(): string {
  const extra = Constants.expoConfig?.extra as { siteUrl?: string } | undefined;
  const raw = extra?.siteUrl?.trim();
  return (raw ? raw : DEFAULT_SITE_URL).replace(/\/+$/, "");
}

/**
 * Bare host, for share signatures and addresses. Derived with string ops on
 * purpose: React Native's URL implementation does not reliably expose `.host`
 * under Hermes, so `new URL()` is not used here.
 */
export function getSiteHost(): string {
  // Everything before the first "/" after the scheme. (A split()[0] needed a `?? ""`
  // fallback for the type checker that no input could reach: one uncoverable branch.)
  return getSiteUrl().replace(/^https?:\/\//i, "").replace(/\/[\s\S]*$/, "");
}

/** Absolute URL for a site path. */
export function siteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The two legal links every store review checks. */
export function getLegalUrls(): { terms: string; privacy: string } {
  return { terms: siteUrl("/legal/terms"), privacy: siteUrl("/legal/privacy") };
}

export function getFeedbackMailto(): string {
  return `mailto:feedback@${getSiteHost()}`;
}
