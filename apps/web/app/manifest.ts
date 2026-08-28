import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

/**
 * One manifest, in the default locale: it is served from the root, outside the
 * `[locale]` segment, so it cannot read the request's locale.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: "meta.app",
  });

  return {
    name: t("name"),
    short_name: siteConfig.name,
    description: t("description"),
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0F",
    theme_color: "#0A0A0F",
    icons: [{ src: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
  };
}
