import type { Metadata } from "next";

import { absoluteUrl, siteConfig } from "./site";

type BuildMetadataInput = {
  title?: string;
  description?: string;
  /** Route path, used for the canonical URL and the Open Graph URL. */
  path?: string;
  /**
   * Absolute or root-relative image. Omit to inherit the route's file-based
   * `opengraph-image`, which is what most pages should do.
   */
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

/**
 * Single source of page metadata. A dynamic route such as
 * `/a/@username/post/[postId]` only has to call this from `generateMetadata`
 * with the post's title, description and OG image.
 */
export function buildMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  image,
  type = "website",
  noIndex = false,
}: BuildMetadataInput = {}): Metadata {
  const url = absoluteUrl(path);
  const resolvedTitle = title ?? `${siteConfig.name} — ${siteConfig.tagline}`;
  const images = image ? [{ url: image, alt: resolvedTitle }] : undefined;

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: siteConfig.name,
      title: resolvedTitle,
      description,
      locale: "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitter,
      creator: siteConfig.twitter,
      title: resolvedTitle,
      description,
      images,
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
