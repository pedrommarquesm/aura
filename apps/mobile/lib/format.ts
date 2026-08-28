import type { AppLocale } from '@/lib/i18n/locales';

/**
 * Number formatting for the values the product is built around.
 *
 * Every function takes the active locale rather than closing over one: `12,421` in
 * English is `12.421` in Portuguese, and a separator baked in at module scope is wrong
 * in one of the two languages. Components get these pre-bound through `useFormat()`.
 *
 * `Intl.NumberFormat` construction is the expensive part, so instances are cached per
 * locale — these run on every row of the feed and the leaderboard.
 */
const cache = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: AppLocale, style: 'decimal' | 'compact'): Intl.NumberFormat {
  const key = `${locale}:${style}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const format = new Intl.NumberFormat(
    locale,
    style === 'compact' ? { notation: 'compact', maximumFractionDigits: 1 } : undefined,
  );

  cache.set(key, format);
  return format;
}

/** Aura is always shown in full — the exact number is the point of the product. */
export function formatAura(value: number, locale: AppLocale): string {
  return numberFormat(locale, 'decimal').format(Math.trunc(value));
}

/**
 * Like and follower counts are shown compact once they get long. The compact form is
 * localized too, so 12,421 reads `12.4K` in English and `12,4 mil` in Portuguese.
 */
export function formatCount(value: number, locale: AppLocale): string {
  return numberFormat(locale, value < 10_000 ? 'decimal' : 'compact').format(value);
}

export function formatNumber(value: number, locale: AppLocale): string {
  return numberFormat(locale, 'decimal').format(value);
}
