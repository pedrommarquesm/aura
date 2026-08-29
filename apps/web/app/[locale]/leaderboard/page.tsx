import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LeaderboardBoard } from "@/components/leaderboard-board";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container, Eyebrow } from "@/components/landing/section";
import type { LeaderboardPage } from "@/lib/api/types";
import { dehydrate } from "@tanstack/react-query";

import { loadLeaderboardPage } from "@/lib/query/actions";
import { makeQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/lib/query/hydrate";
import { queryKeys } from "@/lib/query/keys";
import { buildMetadata } from "@/lib/seo";

/** Same window as the public feed cache (architecture §8.4). */
export const revalidate = 10;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.leaderboard");

  return buildMetadata({
    locale,
    pathname: "/leaderboard",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function LeaderboardPage() {
  const t = await getTranslations("leaderboard.page");

  let board: LeaderboardPage | null = null;
  let failed = false;

  try {
    board = await loadLeaderboardPage(100);
  } catch {
    failed = true;
  }

  const queryClient = makeQueryClient();
  if (board) {
    queryClient.setQueryData(queryKeys.leaderboard.global(100), board);
  }

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 py-16 sm:py-20">
          <Container className="flex max-w-2xl flex-col gap-4">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="text-title text-balance sm:text-display">
              {t("title")}
            </h1>
            <p className="text-body text-text-secondary">{t("description")}</p>
          </Container>
        </section>

        <Container className="py-12 sm:py-16">
          <LeaderboardBoard
            entries={board?.entries ?? []}
            empty={t("empty")}
            unavailable={t("unavailable")}
            failed={failed}
          />
        </Container>
      </main>
      <SiteFooter />
    </Hydrate>
  );
}
