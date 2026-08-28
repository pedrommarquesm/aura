import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { formats } from "./formats";
import { catalogs } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // An explicit locale (`getTranslations({locale})`) wins: route handlers and
  // metadata routes render outside `[locale]`, where root params are empty.
  if (!locale) {
    const segment = await rootParams.locale();

    if (hasLocale(routing.locales, segment)) {
      locale = segment;
    } else if (segment === undefined) {
      // Rendered outside the `[locale]` segment. The share URL
      // `/a/@username/post/:postId` will land here once it exists — it stays
      // unprefixed on purpose (docs/i18n.md).
      locale = routing.defaultLocale;
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
