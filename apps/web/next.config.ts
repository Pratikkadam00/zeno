import type { NextConfig } from "next";
import { isPublicAnalyticsEnabled } from "./lib/analytics-flag";
import { SITE_HOST, SITE_URL } from "./lib/site";

// Security headers applied to every response, including a complete Content-
// Security-Policy. Every resource type is policed: default-src 'self' is the
// fallback. No 'unsafe-eval'.
//
// Inline scripts (P4.3): this header keeps script-src 'unsafe-inline', but it is
// NOT what decides which inline scripts run. Each prerendered page also carries
// a <meta> CSP listing the sha256 of its own inline scripts, written after
// `next build` by scripts/csp-script-hashes.mjs; a browser enforces both
// policies, so only those scripts run (an injected one is blocked: e2e). The
// header can't list them itself because every page's payload script differs;
// nonces would force every page to render per request; Next's experimental SRI
// left the inline scripts blocked and the site unhydrated (measured, P4.3).
// 'unsafe-inline' here is the fallback if a page ever lacked its <meta>.
//
// style-src keeps 'unsafe-inline': measured in the build, 5 pages carry style
// attributes in their markup and 2 carry <style> elements (P4.3).
//
// 'unsafe-eval' is added to script-src ONLY for the dev server: Next's dev
// server (Fast Refresh, stack-trace reconstruction) uses eval() internally,
// which the strict production policy blocks — that code never ships to real
// users, so relaxing it here doesn't change the production security posture
// (React itself never calls eval() in production, per its own runtime check).
// Keyed on "development", not "not production": `next build`/`next start` keep
// a pre-set NODE_ENV such as "test" or "staging", and a server started that way
// is still serving real users, so it must get the strict policy (fail closed).
const isDevServer = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevServer ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

// Browser features the site never uses, switched off for it and anything it
// could ever embed: OWASP Secure Headers' list (2026-09-13) plus
// browsing-topics, less three: interest-cohort (FLoC, retired; browsing-topics
// replaced it), sync-xhr (OWASP keeps it on for self, the default anyway) and
// unload (not taken: its effect on Next's own page handling isn't measured).
// The site uses none of the denied features (P4.3 checked the code).
const DENIED_FEATURES = [
  "accelerometer", "autoplay", "browsing-topics", "camera", "cross-origin-isolated", "display-capture",
  "encrypted-media", "fullscreen", "geolocation", "gyroscope", "keyboard-map", "magnetometer",
  "microphone", "midi", "payment", "picture-in-picture", "publickey-credentials-get",
  "screen-wake-lock", "usb", "web-share", "xr-spatial-tracking", "clipboard-read", "clipboard-write",
  "gamepad", "hid", "idle-detection", "serial"
];

// Checked against OWASP Secure Headers' recommended set in P4.3. Where ours
// differs, on purpose: Referrer-Policy sends our ORIGIN (never the path) to the
// sites we link to, so services see visits came from Zeno; HSTS carries
// `preload` because submitting the domain needs it (submitting is the owner's
// call: OWNER_ACTIONS); no Cache-Control no-store or Clear-Site-Data (a public
// site meant to be cached; there's no sign-out); no COEP (nothing to isolate).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: DENIED_FEATURES.map((f) => `${f}=()`).join(", ") },
  // Off: the guides link to hundreds of services; prefetching their names
  // would tell the visitor's DNS resolver which ones a page shows.
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Pages we open (and pages that open us) get no handle on this window.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Content-Security-Policy", value: csp }
];

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js": it tells a scanner which exploits to try first
  // (OWASP Secure Headers lists it to remove).
  poweredByHeader: false,
  experimental: {
    // Turbopack's build cache (on by default since 16.3) stores a snapshot of
    // the build's ENVIRONMENT in .next/cache, compressed: every variable set
    // while building, secrets included (measured, F186). Our builds never keep
    // .next/cache (fresh CI runners, no cache step), so it only ever wrote that
    // snapshot to disk; Next's docs: if the build environment never preserves
    // .next/cache, set this to false.
    turbopackFileSystemCacheForBuild: false
  },
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@zeno/shared", "@zeno/service-catalog"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // F184: while the sample dashboard is off, /analytics is answered by the
    // site's own 404 page. Its notFound() during prerender gave Next's bare
    // error document instead (no lang attribute, no fonts, no theme script),
    // whichever file threw it; a path that matches no page gets the real one.
    return isPublicAnalyticsEnabled()
      ? []
      : { beforeFiles: [{ source: "/analytics", destination: "/analytics-is-off" }], afterFiles: [], fallback: [] };
  },
  async redirects() {
    return [
      // Canonicalize to the apex domain — matches metadataBase,
      // sitemap.ts, and robots.ts elsewhere in this app, all of which already
      // treat the site origin (lib/site.ts) as canonical. Trailing-slash canonicalization
      // needs no config: verified locally (next build && next start) that
      // Next.js 16's App Router already 308s /path/ -> /path by default.
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${SITE_HOST}` }],
        destination: `${SITE_URL}/:path*`,
        permanent: true
      }
    ];
  }
};

export default nextConfig;
