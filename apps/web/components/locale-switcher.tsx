"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { htmlLang, localeLabels, routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/**
 * Two real links rather than a dropdown: crawlable, keyboard-navigable and
 * usable without JavaScript.
 *
 * `usePathname` returns the internal route (`/about`), so `Link` re-localizes
 * it for the target locale — switching on `/about` lands on `/pt/sobre`, not on
 * the homepage. Clicking also writes the locale cookie, which is what makes an
 * explicit choice outlive `accept-language`.
 */
// The link to English renders as `/en/about` even though English is unprefixed,
// and that is load-bearing rather than a leak. With the cookie set to `pt` the
// proxy reads an unprefixed `/about` as "no locale stated" and sends it back to
// `/pt/sobre`, so a clean href could never switch away from Portuguese. The
// prefix states the locale, so the proxy rewrites the cookie and then redirects
// on to the canonical `/about`. The `<link rel="alternate">` tags in the head
// are generated separately and always point at canonical URLs.
export function LocaleSwitcher() {
  const pathname = usePathname();
  const activeLocale = useLocale();
  const t = useTranslations("nav.locale");

  return (
    <nav
      aria-label={t("label")}
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface/70 p-0.5 text-caption backdrop-blur-sm"
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;

        return (
          <Link
            key={locale}
            href={pathname}
            // The active locale is left implicit: passing it would force a
            // prefix and cost a redirect to say what the URL already says.
            locale={isActive ? undefined : locale}
            hrefLang={htmlLang[locale]}
            aria-label={localeLabels[locale].name}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold transition-colors duration-(--motion-quick) ease-out",
              isActive
                ? "bg-surface-elevated text-text"
                : "text-text-muted hover:text-text",
            )}
          >
            {localeLabels[locale].code}
          </Link>
        );
      })}
    </nav>
  );
}
