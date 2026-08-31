import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { formats } from "./formats";
import { catalogs } from "./messages";
import { isAppLocale, resolveViewerLocale } from "./negotiate";
import { routing, type AppLocale } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // An explicit locale (`getTranslations({locale})`) wins: route handlers and
  // metadata routes render outside `[locale]`, where root params are empty.
  if (!locale) {
    const segment = await rootParams.locale();

    if (hasLocale(routing.locales, segment)) {
      locale = segment;
    } else if (segment === undefined) {
      // Share URLs (`/a/:username/post/:postId`) stay unprefixed. The page
      // still renders in the viewer's locale: cookie, then Accept-Language,
      // then English (docs/i18n.md).
      locale = await viewerLocale();
    } else {
      // `[locale]` also catches unknown paths, so anything else is a 404
      // rather than a silent fallback.
      notFound();
    }
  }

  return {
    locale,
    messages: catalogs[locale],
    formats,
    // Only the copyright year is date-derived; pinning the zone keeps server
    // and client agreeing on it.
    timeZone: "Europe/Lisbon",
  };
});

/**
 * Locale for routes that live outside `[locale]`. The switcher's cookie wins
 * over the browser header so a Portuguese viewer who already chose PT keeps
 * seeing PT on a shared English-looking URL.
 */
async function viewerLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const fromCookie = jar.get("NEXT_LOCALE")?.value;
  if (isAppLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const locale = resolveViewerLocale(part.split(";")[0]);
    if (locale) return locale;
  }

  return routing.defaultLocale;
}
