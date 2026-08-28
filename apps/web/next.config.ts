import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone/server.js with only the traced dependencies, so the
  // container image does not have to carry node_modules. See Dockerfile.
  output: "standalone",
  poweredByHeader: false,
  images: {
    // Feed payloads only ever contain CDN URLs (architecture §6.4).
    remotePatterns: [{ protocol: "https", hostname: "cdn.aura.app" }],
  },
};

export default nextConfig;
