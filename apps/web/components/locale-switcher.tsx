"use client";

import { usePathname as useNextPathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { htmlLang, localeLabels, routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { isSharePath } from "@/lib/share";

/**
 * One real link per locale rather than a dropdown: crawlable,
 * keyboard-navigable and usable without JavaScript.
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
function writeLocaleCookie(locale: AppLocale) {
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LocaleSwitcher() {
  const pathname = usePathname();
  const sharePath = useNextPathname();
  const activeLocale = useLocale();
  const t = useTranslations("nav.locale");
  const onShareUrl = isSharePath(sharePath);

  return (
    <nav
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-0.5 rounded-full border border-border bg-surface/70 p-0.5 text-caption backdrop-blur-sm"
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;

        const className = cn(
          "rounded-full px-2 py-1 font-semibold transition-colors duration-(--motion-quick) ease-out",
          isActive
            ? "bg-surface-elevated text-text"
            : "text-text-muted hover:text-text",
        );

        // Share URLs stay unprefixed. next-intl Link would turn `/a/x/post/y`
        // into `/pt/a/x/post/y`, which is not a route and would fragment the
        // link graph (docs/i18n.md). Cookie + reload keeps the same URL.
        if (onShareUrl) {
          return (
            <a
              key={locale}
              href={sharePath}
              hrefLang={htmlLang[locale]}
              aria-label={localeLabels[locale].name}
              aria-current={isActive ? "true" : undefined}
              className={className}
              onClick={(event) => {
                if (isActive) {
                  event.preventDefault();
                  return;
                }
                event.preventDefault();
                writeLocaleCookie(locale);
                window.location.assign(sharePath);
              }}
            >
              {localeLabels[locale].code}
            </a>
          );
        }

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
            className={className}
          >
            {localeLabels[locale].code}
          </Link>
        );
      })}
    </nav>
  );
}
