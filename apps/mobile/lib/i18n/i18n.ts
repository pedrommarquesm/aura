// Must come first: i18next-icu resolves plurals through `Intl.PluralRules` the moment a
// message is formatted, and the instance below is initialised at module scope.
import './intl';

import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';

import { i18nOptions } from './config';
import { resolveLocale, type AppLocale } from './locales';

/** The device's preferred language, narrowed to a locale we ship. */
export function deviceLocale(): AppLocale {
  return resolveLocale(getLocales().map((locale) => locale.languageTag));
}

/**
 * An explicit instance rather than the `i18next` global, so nothing can be translated
 * through a half-configured singleton. `initReactI18next` still registers it as the
 * default for `useTranslation`.
 *
 * Initialised synchronously at import: the catalogs are bundled, so there is nothing to
 * await, and the first screen renders translated on its first frame instead of flashing
 * English or a raw key.
 */
const i18n = createInstance();

void i18n.use(ICU).use(initReactI18next).init(i18nOptions(deviceLocale()));

export default i18n;
