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
    "/feed": { en: "/feed", pt: "/explorar" },
    "/leaderboard": { en: "/leaderboard", pt: "/classificacao" },
    "/login": { en: "/login", pt: "/entrar" },
    "/username": { en: "/username", pt: "/nome" },
    "/settings": { en: "/settings", pt: "/definicoes" },
  },
});

export type AppLocale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;

/**
 * Language tags for `lang` and `hreflang`, which want the territory. This is
 * the only place `pt-PT` appears, and it must stay that way.
 *
 * The locale above is `pt`, not `pt-PT`, because that is what formats numbers
 * (see docs/i18n.md). CLDR's `pt-PT` groups thousands with a no-break space —
 * `12 421` rather than `12.421` — and mobile formats with `pt`, so widening
 * the locale here would show the same user two different Aura totals.
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
