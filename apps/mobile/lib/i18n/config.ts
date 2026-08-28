import type { InitOptions } from 'i18next';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale } from './locales';
import en from '@/locales/en.json';
import pt from '@/locales/pt.json';

/** One namespace. The catalogs are namespaced by key prefix instead (docs/i18n.md). */
export const NAMESPACE = 'translation';

export const resources = {
  en: { [NAMESPACE]: en },
  pt: { [NAMESPACE]: pt },
} as const;

/**
 * Everything about the i18next setup that does not depend on React or on the device,
 * kept separate so `scripts/check-locales.mjs` can assert against the same
 * configuration the app runs on rather than a lookalike.
 */
export function i18nOptions(language: AppLocale): InitOptions {
  return {
    resources,
    lng: language,
    // Anything missing in `pt` renders the English string, never the key.
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    defaultNS: NAMESPACE,
    ns: [NAMESPACE],
    // Regionless catalogs, so `pt-BR` must not become a lookup for a `pt-BR` resource.
    load: 'languageOnly',
    // React escapes for us, and escaping here mangles apostrophes in the copy.
    interpolation: { escapeValue: false },
  };
}
