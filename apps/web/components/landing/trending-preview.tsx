import { getLocale, getTranslations } from "next-intl/server";

import { Section } from "@/components/landing/section";
import { TrendingGrid } from "@/components/landing/trending-grid";
import { Link } from "@/i18n/navigation";
import { sectionId } from "@/i18n/sections";

export async function TrendingPreview() {
  const locale = await getLocale();
  const t = await getTranslations("landing.trending");

  return (
    <Section
      id={sectionId(locale, "trending")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <TrendingGrid empty={t("empty")} unavailable={t("unavailable")} />

      <p className="mt-8 text-label text-text-muted">{t("note")}</p>
      <p className="mt-4">
        <Link
          href="/feed"
          className="text-label text-aura-bright transition-colors duration-(--motion-quick) ease-out hover:text-text"
        >
          {t("seeAll")}
        </Link>
      </p>
    </Section>
  );
}
