import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { type AppPathname, routing } from "@/i18n/routing";
import { api } from "@/lib/api";
import { alternateUrls } from "@/lib/seo";
import { publicPostPath } from "@/lib/share";
import { absoluteUrl } from "@/lib/site";

/**
 * Static routes in every locale, each entry listing the other locales as
 * alternates. Share URLs stay unprefixed and have no locale alternates.
 */
const ROUTES: ReadonlyArray<{
  pathname: AppPathname;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { pathname: "/", priority: 1, changeFrequency: "daily" },
  { pathname: "/feed", priority: 0.9, changeFrequency: "hourly" },
  { pathname: "/leaderboard", priority: 0.8, changeFrequency: "hourly" },
  { pathname: "/about", priority: 0.6, changeFrequency: "monthly" },
  { pathname: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { pathname: "/terms", priority: 0.4, changeFrequency: "yearly" },
  { pathname: "/contact", priority: 0.4, changeFrequency: "monthly" },
  { pathname: "/settings", priority: 0.3, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const pages = ROUTES.flatMap(({ pathname, priority, changeFrequency }) => {
    const languages = alternateUrls(pathname);

    return routing.locales.map((locale) => ({
      url: absoluteUrl(getPathname({ href: pathname, locale })),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });

  return [...pages, ...(await publicPostEntries())];
}

async function publicPostEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const feed = await api.getFeed({ limit: 20 });
    return feed.items.map((post) => ({
      url: absoluteUrl(publicPostPath(post.author.username, post.id)),
      lastModified: new Date(post.createdAt),
      changeFrequency: "hourly" as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}
