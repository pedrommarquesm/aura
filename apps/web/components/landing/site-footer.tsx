import { useFormatter, useLocale, useTranslations } from "next-intl";

import { AuraMark } from "@/components/aura-mark";
import { Link } from "@/i18n/navigation";
import { sectionId } from "@/i18n/sections";

export function SiteFooter() {
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations("nav.sections");
  const footer = useTranslations("nav.footer");
  const landing = useTranslations("landing.footer");

  const sectionLinks: Array<
    | { label: string; href: "/feed" | "/leaderboard" }
    | { label: string; hash: string }
  > = [
    { label: t("feed"), href: "/feed" },
    { label: t("leaderboard"), href: "/leaderboard" },
    { label: t("whatIsAura"), hash: sectionId(locale, "whatIsAura") },
    { label: t("howItWorks"), hash: sectionId(locale, "howItWorks") },
    { label: t("trending"), hash: sectionId(locale, "trending") },
    { label: t("download"), hash: sectionId(locale, "download") },
  ];

  return (
    <footer className="border-t border-border/70 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <AuraMark />
          <nav
            aria-label={footer("label")}
            className="flex flex-wrap gap-x-6 gap-y-2 text-label text-text-secondary"
          >
            {sectionLinks.map((link) =>
              "href" in link ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors duration-(--motion-quick) ease-out hover:text-text"
                >
                  {link.label}
                </Link>
              ) : (
                <Link
                  key={link.hash}
                  href={{ pathname: "/", hash: link.hash }}
                  className="transition-colors duration-(--motion-quick) ease-out hover:text-text"
                >
                  {link.label}
                </Link>
              ),
            )}
            <Link
              href="/about"
              className="transition-colors duration-(--motion-quick) ease-out hover:text-text"
            >
              {t("about")}
            </Link>
            <Link
              href="/settings"
              className="transition-colors duration-(--motion-quick) ease-out hover:text-text"
            >
              {t("settings")}
            </Link>
          </nav>
        </div>

        <p className="max-w-xl text-caption text-text-muted">
          {landing("note")}
        </p>

        <p className="text-caption text-text-muted">
          {/* A year is an identifier, not a quantity: no thousands separator. */}
          {landing("copyright", {
            year: format.dateTime(new Date(), { year: "numeric" }),
          })}
        </p>
      </div>
    </footer>
  );
}
