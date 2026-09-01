/**
 * The locales the app ships in (docs/i18n.md). `en` is the source language: every key
 * originates there and anything missing elsewhere falls back to it.
 *
 * `pt` is European Portuguese. `pt-br` is Brazilian. `es` is neutral Latin-American
 * Spanish. `pt` — not `pt-PT` — is deliberately also the tag handed to `Intl`. CLDR
 * groups thousands in `pt-PT` with a no-break space (`12 421`) where `pt` uses the
 * dot the i18n contract specifies (`12.421`). `pt-br` formats as `pt-BR` (also a
 * dot). `es` formats as `es`.
 */
export const SUPPORTED_LOCALES = ['en', 'pt', 'pt-br', 'es'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

/** Locale string passed to `Intl`. Never `pt-PT` — that would group with a space. */
export const formatLocale: Record<AppLocale, string> = {
  en: 'en',
  pt: 'pt',
  // CLDR `pt` is Brazilian. `pt-BR` is not a formatjs locale-data file, and
  // `pt-PT` groups with a space — both of our Portuguese catalogs want a dot.
  'pt-br': 'pt',
  es: 'es',
};

function isSupported(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-');
}

/**
 * Picks the first locale we support out of an ordered list of BCP 47 tags — the shape
 * `expo-localization` reports the device's language preferences in.
 *
 * `pt-BR` → `pt-br`. Other `pt-*` regions (`pt-PT`, `pt-MZ`) → European `pt`.
 * `es-*` → `es`. Exact ids (`pt-br`) win before a generic language match.
 */
export function resolveLocale(tags: readonly (string | null | undefined)[]): AppLocale {
  for (const tag of tags) {
    if (!tag) continue;
    const code = normalize(tag);
    if (!code) continue;
    if (isSupported(code)) return code;
    if (code.startsWith('pt-br')) return 'pt-br';
    const language = code.split('-')[0];
    if (language && isSupported(language)) return language;
  }

  return DEFAULT_LOCALE;
}
