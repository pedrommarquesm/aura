/** Treats an unset and an empty env var the same way. */
function env(value: string | undefined, fallback: string) {
  return value && value.length > 0 ? value : fallback;
}

export const siteConfig = {
  name: "Aura",
  tagline: "The social game where likes are the score",
  description:
    "Aura is a social game. Post photos and videos, collect likes, farm Aura and climb the global leaderboard. Free on iOS and Android.",
  url: env(process.env.NEXT_PUBLIC_SITE_URL, "https://aura.app").replace(
    /\/$/,
    "",
  ),
  twitter: "@auraapp",
  /**
   * Primary CTA target. Until a store smart link exists it falls back to the
   * download section, which lists both stores.
   */
  appDownloadUrl: env(process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL, "#download"),
  appStoreUrl: env(
    process.env.NEXT_PUBLIC_APP_STORE_URL,
    "https://apps.apple.com/app/aura",
  ),
  playStoreUrl: env(
    process.env.NEXT_PUBLIC_PLAY_STORE_URL,
    "https://play.google.com/store/apps/details?id=app.aura",
  ),
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
