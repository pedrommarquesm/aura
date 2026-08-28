import type { formats } from "@/i18n/formats";
import type { AppLocale } from "@/i18n/routing";
import type en from "@/messages/en.json";

/**
 * Makes locales, message keys and format names type-checked: a key that is not
 * in the English catalog is a compile error rather than a string on the page.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof en;
    Formats: typeof formats;
  }
}
