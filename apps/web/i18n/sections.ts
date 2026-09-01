import type { AppLocale } from "./routing";

/**
 * Anchor ids for the landing page sections. They are part of the URL, so they
 * are translated like route segments — `/#trending` and `/pt#em-destaque`.
 * Adding a locale means adding a column here.
 */
const SECTION_IDS = {
  whatIsAura: {
    en: "what-is-aura",
    pt: "o-que-e-aura",
    "pt-br": "o-que-e-aura",
    es: "que-es-aura",
  },
  howItWorks: {
    en: "how-it-works",
    pt: "como-funciona",
    "pt-br": "como-funciona",
    es: "como-funciona",
  },
  join: { en: "join", pt: "entrar", "pt-br": "entrar", es: "unirse" },
  play: { en: "play", pt: "jogar", "pt-br": "jogar", es: "jugar" },
  trending: {
    en: "trending",
    pt: "em-destaque",
    "pt-br": "em-destaque",
    es: "en-tendencia",
  },
  leaderboard: {
    en: "leaderboard",
    pt: "classificacao",
    "pt-br": "classificacao",
    es: "clasificacion",
  },
  download: {
    en: "download",
    pt: "descarregar",
    "pt-br": "baixar",
    es: "descargar",
  },
} as const satisfies Record<string, Record<AppLocale, string>>;

export type SectionName = keyof typeof SECTION_IDS;

export function sectionId(locale: AppLocale, section: SectionName) {
  return SECTION_IDS[section][locale];
}

export function sectionHash(locale: AppLocale, section: SectionName) {
  return `#${sectionId(locale, section)}`;
}
