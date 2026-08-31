/** Treats an unset and an empty env var the same way. */
function env(value: string | undefined, fallback: string) {
  return value && value.length > 0 ? value : fallback;
}

export const siteConfig = {
  /**
   * Wordmark / spoken product name. Never translated (docs/i18n.md).
   * Store, domain, and socials are Auraclimb — docs/brand.md.
   */
  name: "Aura",
  url: env(process.env.NEXT_PUBLIC_SITE_URL, "https://www.aurarankd.com").replace(
    /\/$/,
    "",
  ),
  twitter: "@auraclimb",
  /**
   * Primary CTA target. Empty until a store smart link exists, in which case
   * callers fall back to the localized download section anchor.
   */
  appDownloadUrl: env(process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL, ""),
  appStoreUrl: env(
    process.env.NEXT_PUBLIC_APP_STORE_URL,
    "https://apps.apple.com/app/auraclimb",
  ),
  playStoreUrl: env(
    process.env.NEXT_PUBLIC_PLAY_STORE_URL,
    "https://play.google.com/store/apps/details?id=app.auraclimb.mobile",
  ),
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

/**
 * Where the primary CTA points. Without a store smart link it scrolls to the
 * download section, whose anchor id is localized.
 */
export function downloadHref(sectionHash: string) {
  return siteConfig.appDownloadUrl || sectionHash;
}
