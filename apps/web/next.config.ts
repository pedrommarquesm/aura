import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Feed payloads only ever contain CDN URLs (architecture §6.4).
    remotePatterns: [{ protocol: "https", hostname: "cdn.aura.app" }],
  },
};

export default nextConfig;
