import type { NextConfig } from "next";

// Security headers applied to every response, including a complete Content-
// Security-Policy. Every resource type is policed: default-src 'self' is the
// fallback, and script/style allow 'unsafe-inline' because (a) Next emits inline
// hydration scripts and (b) Motion sets inline style ATTRIBUTES — neither of
// which a static header can nonce. This still blocks the high-value vectors:
// cross-origin script/frame/connect/img loading, base-tag and form-action
// hijacking, and framing. No 'unsafe-eval'.
//
// We deliberately do NOT use nonce + 'strict-dynamic': verified locally that it
// blocks the statically-prerendered pages' scripts (no per-request nonce on
// static HTML), and making it work would force site-wide dynamic rendering —
// killing SSG on the 500+ cancel-guide SEO pages — for defense against an XSS
// sink the audit confirmed does not exist (no external scripts, no iframes, no
// user-rendered HTML). Revisit if a user-content sink is ever introduced.
//
// 'unsafe-eval' is added to script-src ONLY outside production: Next's dev
// server (Fast Refresh, stack-trace reconstruction) uses eval() internally,
// which the strict production policy blocks — that code never ships to real
// users, so relaxing it here doesn't change the production security posture
// (React itself never calls eval() in production, per its own runtime check).
const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
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

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: csp }
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@zeno/shared", "@zeno/service-catalog"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Canonicalize to the apex domain (zeno.app) — matches metadataBase,
      // sitemap.ts, and robots.ts elsewhere in this app, all of which already
      // treat https://zeno.app as canonical. Trailing-slash canonicalization
      // needs no config: verified locally (next build && next start) that
      // Next.js 16's App Router already 308s /path/ -> /path by default.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.zeno.app" }],
        destination: "https://zeno.app/:path*",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
