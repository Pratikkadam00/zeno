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
const DEFAULT_SITE_URL = "https://zeno.app";

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
  return getSiteUrl().replace(/^https?:\/\//i, "").split("/")[0] ?? "";
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
