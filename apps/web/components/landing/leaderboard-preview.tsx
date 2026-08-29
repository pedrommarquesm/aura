import { getLocale, getTranslations } from "next-intl/server";

import { LeaderboardBoard } from "@/components/leaderboard-board";
import { Section } from "@/components/landing/section";
import { ButtonLink } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { sectionHash, sectionId } from "@/i18n/sections";
import type { LeaderboardEntry } from "@/lib/api/types";
import { downloadHref } from "@/lib/site";

export async function LeaderboardPreview({
  entries,
  failed,
}: {
  entries: LeaderboardEntry[];
  failed: boolean;
}) {
  const locale = await getLocale();
  const t = await getTranslations("landing.leaderboard");
  const actions = await getTranslations("common.actions");

  return (
    <Section
      id={sectionId(locale, "leaderboard")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-12">
        <LeaderboardBoard
          entries={entries}
          empty={t("empty")}
          unavailable={t("unavailable")}
          failed={failed}
        />

        <div className="flex flex-col gap-5 lg:pt-4">
          <h3 className="text-title text-balance">{t("aside.title")}</h3>
          <p className="text-body text-text-secondary">{t("aside.body")}</p>
          <ButtonLink
            href={downloadHref(sectionHash(locale, "download"))}
            size="lg"
            className="self-start"
          >
            {actions("getAuraApp")}
          </ButtonLink>
          <p>
            <Link
              href="/leaderboard"
              className="text-label text-aura-bright transition-colors duration-(--motion-quick) ease-out hover:text-text"
            >
              {t("seeAll")}
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
