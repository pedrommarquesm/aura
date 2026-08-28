/**
 * The locales the app ships in (docs/i18n.md). `en` is the source language: every key
 * originates there and anything missing elsewhere falls back to it.
 *
 * `pt` is European Portuguese, and `pt` — not `pt-PT` — is deliberately also the tag
 * handed to `Intl`. CLDR groups thousands in `pt-PT` with a no-break space (`12 421`)
 * where `pt` uses the dot the i18n contract specifies (`12.421`), which is what
 * Portuguese products actually show.
 */
export const SUPPORTED_LOCALES = ['en', 'pt'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

function isSupported(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the first locale we support out of an ordered list of BCP 47 tags — the shape
 * `expo-localization` reports the device's language preferences in. Region is ignored:
 * `pt-BR` and `pt-MZ` both get the Portuguese catalog, which is closer than English.
 */
export function resolveLocale(tags: readonly (string | null | undefined)[]): AppLocale {
  for (const tag of tags) {
    const language = tag?.split('-')[0]?.toLowerCase();
    if (language && isSupported(language)) return language;
  }

  return DEFAULT_LOCALE;
}
