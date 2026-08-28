import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { LeaderboardBoard, LeaderboardSkeleton } from "@/components/leaderboard-board";
import { Section } from "@/components/landing/section";
import { ButtonLink } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { sectionHash, sectionId } from "@/i18n/sections";
import { api } from "@/lib/api";
import { downloadHref } from "@/lib/site";

export function LeaderboardPreview() {
  const locale = useLocale();
  const t = useTranslations("landing.leaderboard");
  const actions = useTranslations("common.actions");

  return (
    <Section
      id={sectionId(locale, "leaderboard")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-12">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardRows />
        </Suspense>

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

async function LeaderboardRows() {
  const t = await getTranslations("landing.leaderboard");

  let entries: Awaited<ReturnType<typeof api.getGlobalLeaderboard>>["entries"] =
    [];
  let failed = false;

  try {
    entries = (await api.getGlobalLeaderboard({ limit: 10 })).entries;
  } catch {
    failed = true;
  }

  return (
    <LeaderboardBoard
      entries={entries}
      empty={t("empty")}
      unavailable={t("unavailable")}
      failed={failed}
    />
  );
}
