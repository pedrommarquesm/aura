import { defineRouting } from "next-intl/routing";

/**
 * Locales, URLs and route segments (see docs/i18n.md).
 *
 * English has no prefix: `/` is the English site, so links that were already
 * shared and the marketing URLs keep working.
 */
export const routing = defineRouting({
  locales: ["en", "pt"],
  defaultLocale: "en",
  localePrefix: "as-needed",

  // An explicit choice has to outlive the session, otherwise the
  // `accept-language` header wins again on the next visit.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },

  /**
   * Internal pathname -> user-facing pathname per locale. The internal one is
   * the folder under `app/[locale]`; adding a route means adding one entry.
   */
  pathnames: {
    "/": "/",
    "/about": { en: "/about", pt: "/sobre" },
  },
});

export type AppLocale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;

/**
 * `pt` is European Portuguese: the URL segment stays short for sharing while
 * the language tag stays correct for `lang` and `hreflang`.
 */
export const htmlLang: Record<AppLocale, string> = {
  en: "en",
  pt: "pt-PT",
};

/** Open Graph wants an underscored territory, not a BCP 47 tag. */
export const ogLocale: Record<AppLocale, string> = {
  en: "en_US",
  pt: "pt_PT",
};

/**
 * Endonyms, so each language is offered in its own language. Not translated
 * and therefore not part of the catalogs.
 */
export const localeLabels: Record<AppLocale, { code: string; name: string }> = {
  en: { code: "EN", name: "English" },
  pt: { code: "PT", name: "Português" },
};
