import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles a minimal Node server + only the deps the
  // app actually imports — Docker images stay small.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
