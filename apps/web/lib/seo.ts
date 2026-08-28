import type { Metadata } from "next";

import { getPathname } from "@/i18n/navigation";
import {
  type AppLocale,
  type AppPathname,
  htmlLang,
  ogLocale,
  routing,
} from "@/i18n/routing";

import { absoluteUrl, siteConfig } from "./site";

type BuildMetadataInput = {
  locale: AppLocale;
  /** Internal route, e.g. `/about`. Localized per locale for every URL below. */
  pathname: AppPathname;
  /** `<title>`. A string gets the `· Aura` suffix; `{absolute}` replaces it. */
  title?: Metadata["title"];
  /** Open Graph and Twitter title, which should read on its own. */
  socialTitle: string;
  description: string;
  /**
   * Absolute or root-relative image. Omit to inherit the route's file-based
   * `opengraph-image`, which is what most pages should do.
   */
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

/** Every locale's URL for one route, plus the `x-default` search engines want. */
function alternateUrls(pathname: AppPathname) {
  const languages: Record<string, string> = {};

  for (const locale of routing.locales) {
    languages[htmlLang[locale]] = absoluteUrl(getPathname({ href: pathname, locale }));
  }
  languages["x-default"] = absoluteUrl(
    getPathname({ href: pathname, locale: routing.defaultLocale }),
  );

  return languages;
}

/**
 * Single source of page metadata. A dynamic route such as
 * `/a/@username/post/[postId]` only has to call this from `generateMetadata`
 * with the post's locale, title, description and OG image.
 */
export function buildMetadata({
  locale,
  pathname,
  title,
  socialTitle,
  description,
  image,
  type = "website",
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(getPathname({ href: pathname, locale }));
  // An explicit `images: undefined` would suppress the file-based
  // opengraph-image, so the key is only set when there is a value.
  const images = image ? { images: [{ url: image, alt: socialTitle }] } : {};

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url, languages: alternateUrls(pathname) },
    openGraph: {
      type,
      url,
      siteName: siteConfig.name,
      title: socialTitle,
      description,
      locale: ogLocale[locale],
      alternateLocale: routing.locales
        .filter((candidate) => candidate !== locale)
        .map((candidate) => ogLocale[candidate]),
      ...images,
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitter,
      creator: siteConfig.twitter,
      title: socialTitle,
      description,
      ...images,
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
