import { useLocale, useTranslations } from "next-intl";

import { ArrowRightIcon } from "@/components/icons";
import { Container, Eyebrow } from "@/components/landing/section";
import { ButtonLink, buttonClassName } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { sectionHash, sectionId } from "@/i18n/sections";
import { downloadHref } from "@/lib/site";

export function AboutIntro() {
  const locale = useLocale();
  const t = useTranslations("about.intro");
  const actions = useTranslations("common.actions");

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_20%_-10%,var(--color-aura-deep),transparent_60%)] opacity-45"
      />

      <Container className="flex flex-col gap-6 pt-16 pb-16 sm:pt-24 sm:pb-20">
        <Eyebrow>{t("eyebrow")}</Eyebrow>

        <h1 className="text-display tracking-tight text-balance sm:text-[3.25rem] sm:leading-[1.05]">
          {t("title")}
        </h1>

        <p className="max-w-2xl text-body text-text-secondary">{t("body")}</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <ButtonLink href={downloadHref(sectionHash(locale, "download"))}>
            {actions("getAuraApp")}
          </ButtonLink>
          {/* Points back at the landing page section, so it has to be
              localized as a route rather than a bare anchor. */}
          <Link
            href={{ pathname: "/", hash: sectionId(locale, "trending") }}
            className={buttonClassName({ variant: "secondary" })}
          >
            {actions("seeTrending")}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
