import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_LOCALE, resolveLocale, type AppLocale } from './locales';
import { formatAura, formatCount, formatNumber, formatSigned } from '@/lib/format';

/** The locale the UI is currently rendering in. Re-renders when it changes. */
export function useLocale(): AppLocale {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  return language ? resolveLocale([language]) : DEFAULT_LOCALE;
}

export type Format = {
  aura: (value: number) => string;
  count: (value: number) => string;
  number: (value: number) => string;
  signed: (value: number) => string;
};

/**
 * Number formatters bound to the active locale. Memoised on the locale so the feed does
 * not rebuild closures per row.
 */
export function useFormat(): Format {
  const locale = useLocale();

  return useMemo(
    () => ({
      aura: (value: number) => formatAura(value, locale),
      count: (value: number) => formatCount(value, locale),
      number: (value: number) => formatNumber(value, locale),
      signed: (value: number) => formatSigned(value, locale),
    }),
    [locale],
  );
}
