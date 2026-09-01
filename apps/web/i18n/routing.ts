import { defineRouting } from "next-intl/routing";

/**
 * Locales, URLs and route segments (see docs/i18n.md).
 *
 * English has no prefix: `/` is the English site, so links that were already
 * shared and the marketing URLs keep working.
 */
export const routing = defineRouting({
  locales: ["en", "pt", "pt-br", "es"],
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
    "/about": {
      en: "/about",
      pt: "/sobre",
      "pt-br": "/sobre",
      es: "/acerca",
    },
    "/feed": {
      en: "/feed",
      pt: "/explorar",
      "pt-br": "/explorar",
      es: "/explorar",
    },
    "/leaderboard": {
      en: "/leaderboard",
      pt: "/classificacao",
      "pt-br": "/classificacao",
      es: "/clasificacion",
    },
    "/login": {
      en: "/login",
      pt: "/entrar",
      "pt-br": "/entrar",
      es: "/entrar",
    },
    "/username": {
      en: "/username",
      pt: "/nome",
      "pt-br": "/nome",
      es: "/nombre",
    },
    "/settings": {
      en: "/settings",
      pt: "/definicoes",
      "pt-br": "/configuracoes",
      es: "/ajustes",
    },
    "/terms": {
      en: "/terms",
      pt: "/termos",
      "pt-br": "/termos",
      es: "/terminos",
    },
    "/faq": {
      en: "/faq",
      pt: "/perguntas",
      "pt-br": "/perguntas",
      es: "/preguntas",
    },
    "/contact": {
      en: "/contact",
      pt: "/contacto",
      "pt-br": "/contato",
      es: "/contacto",
    },
  },
});

export type AppLocale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;

/**
 * Language tags for `lang` and `hreflang`, which want the territory. This is
 * the only place `pt-PT` appears for European Portuguese, and it must stay
 * that way.
 *
 * The locale above is `pt`, not `pt-PT`, because that is what formats numbers
 * (see docs/i18n.md). CLDR's `pt-PT` groups thousands with a no-break space —
 * `12 421` rather than `12.421` — and mobile formats with `pt`, so widening
 * the locale here would show the same user two different Aura totals.
 *
 * `pt-br` formats with `pt-BR` (also a dot). `es` is neutral Spanish.
 */
export const htmlLang: Record<AppLocale, string> = {
  en: "en",
  pt: "pt-PT",
  "pt-br": "pt-BR",
  es: "es",
};

/** Open Graph wants an underscored territory, not a BCP 47 tag. */
export const ogLocale: Record<AppLocale, string> = {
  en: "en_US",
  pt: "pt_PT",
  "pt-br": "pt_BR",
  es: "es_419",
};

/**
 * Endonyms, so each language is offered in its own language. Not translated
 * and therefore not part of the catalogs.
 */
export const localeLabels: Record<AppLocale, { code: string; name: string }> = {
  en: { code: "EN", name: "English" },
  pt: { code: "PT", name: "Português" },
  "pt-br": { code: "BR", name: "Português (Brasil)" },
  es: { code: "ES", name: "Español" },
};

/** GIS button locale — Google wants a BCP 47 tag, not our short ids. */
export const googleSignInLocale: Record<AppLocale, string> = {
  en: "en",
  pt: "pt-PT",
  "pt-br": "pt-BR",
  es: "es",
};
