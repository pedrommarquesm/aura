import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * Static routes only. Public post and profile URLs (WEB-10, WEB-11) get added
 * here as additional entries once the API can list them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
