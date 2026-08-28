import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

// Points `next-intl` at i18n/request.ts, which resolves the locale and loads
// the matching catalog.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
