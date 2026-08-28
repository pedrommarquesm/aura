import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";

import { Section } from "@/components/landing/section";
import { LeaderboardRow } from "@/components/leaderboard-row";
import { ButtonLink, Card, Skeleton } from "@/components/ui";
import { sectionHash, sectionId } from "@/i18n/sections";
import { api } from "@/lib/api";
import { downloadHref } from "@/lib/site";

export function LeaderboardPreview() {
  const locale = useLocale();
  const t = useTranslations("landing.leaderboard");
  const board = useTranslations("leaderboard");
  const actions = useTranslations("common.actions");

  return (
    <Section
      id={sectionId(locale, "leaderboard")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-12">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 text-caption tracking-[0.14em] text-text-muted uppercase sm:px-5">
            <span>{board("header.rankCreator")}</span>
            <span>{board("header.aura")}</span>
          </div>
          <Suspense fallback={<LeaderboardSkeleton />}>
            <LeaderboardRows />
          </Suspense>
        </Card>

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
        </div>
      </div>
    </Section>
  );
}

async function LeaderboardRows() {
  const leaderboard = await api.getGlobalLeaderboard({ limit: 10 });

  return (
    <ol className="divide-y divide-border/70">
      {leaderboard.items.map((entry) => (
        <LeaderboardRow key={entry.user.username} entry={entry} />
      ))}
    </ol>
  );
}

function LeaderboardSkeleton() {
  return (
    <ol className="divide-y divide-border/70">
      {Array.from({ length: 10 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ol>
  );
}
