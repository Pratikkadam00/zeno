import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@subradar/shared", "@subradar/service-catalog"]
};

export default nextConfig;
