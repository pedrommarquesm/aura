import { useLocale, useTranslations } from "next-intl";

import { AuraMark } from "@/components/aura-mark";
import { SessionMenu } from "@/components/auth/session-menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ButtonLink } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { sectionHash, sectionId } from "@/i18n/sections";
import { downloadHref } from "@/lib/site";

export function SiteHeader() {
  const locale = useLocale();
  const t = useTranslations("nav.sections");
  const actions = useTranslations("common.actions");

  // The sections live on the landing page, so the links carry the route as
  // well as the hash and keep working from any other page.
  const navLinks: Array<
    | { label: string; href: "/feed" | "/leaderboard" }
    | { label: string; hash: string }
  > = [
    { label: t("feed"), href: "/feed" },
    { label: t("leaderboard"), href: "/leaderboard" },
    { label: t("whatIsAura"), hash: sectionId(locale, "whatIsAura") },
    { label: t("howItWorks"), hash: sectionId(locale, "howItWorks") },
    { label: t("trending"), hash: sectionId(locale, "trending") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <AuraMark />

        <nav
          aria-label={t("label")}
          className="hidden items-center gap-6 lg:flex"
        >
          {navLinks.map((link) =>
            "href" in link ? (
              <Link
                key={link.href}
                href={link.href}
                className="text-label whitespace-nowrap text-text-secondary transition-colors duration-(--motion-quick) ease-out hover:text-text"
              >
                {link.label}
              </Link>
            ) : (
              <Link
                key={link.hash}
                href={{ pathname: "/", hash: link.hash }}
                className="text-label whitespace-nowrap text-text-secondary transition-colors duration-(--motion-quick) ease-out hover:text-text"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <SessionMenu />
          <ButtonLink
            href={downloadHref(sectionHash(locale, "download"))}
            size="sm"
            variant="secondary"
            className="hidden sm:inline-flex"
          >
            {actions("getApp")}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
