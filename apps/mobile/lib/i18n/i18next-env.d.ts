import type en from '@/locales/en.json';

/**
 * Types `t()` against the English catalog, so a renamed or misspelled key is a
 * `tsc` error instead of a raw key on screen.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
