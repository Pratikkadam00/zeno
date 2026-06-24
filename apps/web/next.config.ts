import type { NextConfig } from "next";

// Security headers applied to every response.
//
// The CSP below pins every resource type the site actually uses to its real
// origin: this app has no <iframe>, no external <script>, no client-side
// cross-origin fetch, and self-hosts its fonts via next/font — so frame-src,
// connect-src, img-src, font-src and form-action can all be locked to 'self'
// (img also allows data:/blob: for inline SVG gradients). That blocks the
// high-value injection vectors — form hijacking, exfiltration beacons, framed
// phishing — without any live testing.
//
// script-src / style-src are deliberately NOT set: Next.js emits inline
// hydration scripts and Motion emits inline style attributes, so locking them
// down needs nonce-based CSP (middleware-generated per request) validated
// against the live rendered pages. Note we do NOT set default-src either — a
// default-src would fall through to script/style and break hydration. Tracked
// in SECURITY.md as the nonce follow-up.
const csp = [
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
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
  }
};

export default nextConfig;
