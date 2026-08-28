/**
 * Supported locales.
 *
 * The API is locale-agnostic for client-facing copy: it returns stable error
 * codes and the clients translate them, so adding a language needs no backend
 * deploy. This module exists for the copy the server *does* own — push
 * notifications and emails, which are rendered server-side and therefore need
 * to know the user's language.
 *
 * See docs/i18n.md.
 */
export const SUPPORTED_LOCALES = ['en', 'pt'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * BCP 47 tag used for `Intl` formatting and the `lang` attribute.
 *
 * `pt` means European Portuguese. Kept short in URLs and storage; expanded to
 * `pt-PT` wherever a correct language tag matters.
 */
const LANGUAGE_TAGS: Record<Locale, string> = {
  en: 'en',
  pt: 'pt-PT',
};

export function languageTag(locale: Locale): string {
  return LANGUAGE_TAGS[locale];
}

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

/**
 * Narrows any BCP 47 tag to a locale we actually ship.
 *
 * Matches on the primary subtag, so `pt-BR`, `pt-PT`, and `pt` all resolve to
 * `pt`. Brazilian Portuguese is not a separate locale yet; serving it European
 * Portuguese is a far better outcome than falling back to English.
 */
export function resolveLocale(tag: string | null | undefined): Locale | undefined {
  if (!tag) return undefined;

  const primary = tag.trim().toLowerCase().split('-')[0];
  return isSupportedLocale(primary) ? primary : undefined;
}

/**
 * Picks the best supported locale from an `Accept-Language` header.
 *
 * Honours quality values, so `pt;q=0.9, en;q=0.8` selects Portuguese even
 * though English appears in the list. Falls back to the default rather than
 * throwing: a malformed header from some client in the wild must never fail a
 * request.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.split(';').map((segment) => segment.trim());
      const qParam = params.find((param) => param.startsWith('q='));
      const quality = qParam ? Number.parseFloat(qParam.slice(2)) : 1;

      return {
        tag: tag ?? '',
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const entry of ranked) {
    if (entry.tag === '*') return DEFAULT_LOCALE;

    const locale = resolveLocale(entry.tag);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}
