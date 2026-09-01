import { useLocale, useTranslations } from "next-intl";

import { AuraMark } from "@/components/aura-mark";
import { SessionMenu } from "@/components/auth/session-menu";
import { SettingsMenu } from "@/components/settings-menu";
import { Link } from "@/i18n/navigation";
import { sectionId } from "@/i18n/sections";
import { webAuthEnabled } from "@/lib/launch";

export function SiteHeader() {
  const locale = useLocale();
  const t = useTranslations("nav.sections");
  const actions = useTranslations("common.actions");

  const navLinks: Array<{ label: string; hash: string }> = [
    { label: t("liveCheck"), hash: sectionId(locale, "liveCheck") },
    { label: t("slider"), hash: sectionId(locale, "slider") },
    { label: t("ledger"), hash: sectionId(locale, "ledger") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <AuraMark />
          <Link
            href={{ pathname: "/", hash: sectionId(locale, "join") }}
            className="text-label tracking-wide text-text-secondary uppercase transition-colors duration-(--motion-quick) ease-out hover:text-text lg:hidden"
          >
            {t("join")}
          </Link>
        </div>

        <nav aria-label={t("label")} className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.hash}
              href={{ pathname: "/", hash: link.hash }}
              className="text-caption tracking-[0.14em] whitespace-nowrap text-text-secondary uppercase transition-colors duration-(--motion-quick) ease-out hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SettingsMenu />
          {webAuthEnabled ? (
            <SessionMenu />
          ) : (
            <Link
              href={{ pathname: "/", hash: sectionId(locale, "join") }}
              className="hidden h-10 items-center border border-aura bg-aura px-4 text-caption font-bold tracking-[0.1em] text-bg uppercase transition-colors duration-(--motion-quick) ease-out hover:bg-aura-bright sm:inline-flex"
            >
              {actions("joinEarly")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
