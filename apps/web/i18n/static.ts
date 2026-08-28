import { createFormatter, createTranslator } from "next-intl";

import { formats } from "./formats";
import { catalogs } from "./messages";
import type { AppLocale } from "./routing";

/**
 * Translator and formatter for code that runs outside the React tree, where
 * the request config is not available: metadata image routes and route
 * handlers. Everything rendering inside `[locale]` should use `useTranslations`
 * / `useFormatter` instead.
 */
export function staticTranslator(locale: AppLocale) {
  return createTranslator({ locale, messages: catalogs[locale], formats });
}

export function staticFormatter(locale: AppLocale) {
  return createFormatter({ locale, formats });
}
