import type { NextConfig } from "next";

// Security headers applied to every response. These are the safe, high-value set
// that does not interfere with Next.js script/style loading. A full
// script-src/style-src Content-Security-Policy needs live testing against the
// rendered pages (Next inline scripts + Motion inline styles) — tracked in
// SECURITY.md as a follow-up.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Clickjacking + object/base-tag injection defenses that don't affect script/style loading.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests" }
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@zeno/shared", "@zeno/service-catalog"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
