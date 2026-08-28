import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { type AppPathname, routing } from "@/i18n/routing";
import { alternateUrls } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

/**
 * Static routes in every locale, each entry listing the other locales as
 * alternates. Public post and profile URLs (WEB-10, WEB-11) get added here once
 * the API can list them; those stay unprefixed and have no locale alternates.
 */
const ROUTES: ReadonlyArray<{
  pathname: AppPathname;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { pathname: "/", priority: 1, changeFrequency: "daily" },
  { pathname: "/feed", priority: 0.9, changeFrequency: "hourly" },
  { pathname: "/about", priority: 0.6, changeFrequency: "monthly" },
  { pathname: "/login", priority: 0.4, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.flatMap(({ pathname, priority, changeFrequency }) => {
    const languages = alternateUrls(pathname);

    return routing.locales.map((locale) => ({
      url: absoluteUrl(getPathname({ href: pathname, locale })),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
