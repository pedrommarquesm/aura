import { useLocale, useTranslations } from "next-intl";

import { Container, Eyebrow } from "@/components/landing/section";
import { ButtonLink } from "@/components/ui";
import { sectionId } from "@/i18n/sections";
import { siteConfig } from "@/lib/site";

export function DownloadCta() {
  const locale = useLocale();
  const t = useTranslations("landing.download");
  const actions = useTranslations("common.actions");

  return (
    <section
      id={sectionId(locale, "download")}
      className="scroll-mt-16 py-20 sm:py-28"
    >
      <Container>
        <div className="relative overflow-hidden rounded-xl border border-aura/40 bg-surface p-8 shadow-aura-glow sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,var(--color-aura-deep),transparent_60%)] opacity-70"
          />

          <div className="relative flex flex-col gap-6">
            <Eyebrow>{t("eyebrow")}</Eyebrow>

            <h2 className="max-w-2xl text-title text-balance sm:text-display">
              {t("title")}
            </h2>

            <p className="max-w-xl text-body text-text-secondary">{t("body")}</p>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href={siteConfig.appStoreUrl} size="lg">
                {actions("downloadIphone")}
              </ButtonLink>
              <ButtonLink
                href={siteConfig.playStoreUrl}
                size="lg"
                variant="secondary"
              >
                {actions("downloadAndroid")}
              </ButtonLink>
            </div>

            <p className="text-caption text-text-muted">{t("note")}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
