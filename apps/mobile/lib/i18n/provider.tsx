import { useLocales } from 'expo-localization';
import { useEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from './i18n';
import { resolveLocale } from './locales';
import { usePreferencesStore } from '@/store/preferences';

/**
 * Keeps the active language in sync with the two things that can decide it: the device,
 * and an explicit in-app choice that wins over the device (docs/i18n.md).
 *
 * `useLocales` re-renders when the system language changes while the app is backgrounded,
 * so a user who switches their phone to Portuguese does not have to restart Aura.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const override = usePreferencesStore((state) => state.languageOverride);
  const deviceLocales = useLocales();

  const active = override ?? resolveLocale(deviceLocales.map((locale) => locale.languageTag));

  useEffect(() => {
    if (i18n.language !== active) void i18n.changeLanguage(active);
  }, [active]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
