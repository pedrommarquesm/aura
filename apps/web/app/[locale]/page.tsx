import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";

import { DownloadCta } from "@/components/landing/download-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TrendingPreview } from "@/components/landing/trending-preview";
import { WhatIsAura } from "@/components/landing/what-is-aura";
import { dehydrate } from "@tanstack/react-query";

import { loadLeaderboardPage, loadTrendingPage } from "@/lib/query/actions";
import { makeQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/lib/query/hydrate";
import { toInfinite } from "@/lib/query/infinite";
import { queryKeys } from "@/lib/query/keys";
import { buildMetadata } from "@/lib/seo";

/**
 * Same reason as `/feed` (WEB-19): a prerendered guest snapshot freezes
 * `likedByMe: false` on the trending cards. The permalink already knows.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.home");

  return buildMetadata({
    locale,
    pathname: "/",
    title: { absolute: t("title") },
    socialTitle: t("title"),
    description: t("description"),
  });
}

export default async function HomePage() {
  await connection();
  const queryClient = makeQueryClient();
  const [trendingResult, leaderboardResult] = await Promise.allSettled([
    loadTrendingPage(6),
    loadLeaderboardPage(10),
  ]);

  const trending =
    trendingResult.status === "fulfilled" ? trendingResult.value : null;
  const leaderboard =
    leaderboardResult.status === "fulfilled" ? leaderboardResult.value : null;
  const leaderboardFailed = leaderboardResult.status === "rejected";

  if (trending) {
    queryClient.setQueryData(
      queryKeys.feed.ranking("trending"),
      toInfinite(trending),
    );
  }
  if (leaderboard) {
    queryClient.setQueryData(queryKeys.leaderboard.global(10), leaderboard);
  }

  const topPost = trending?.items[0];
  const leader = leaderboard?.entries[0];
  const authorRank =
    leaderboard?.entries.find(
      (entry) => entry.username === topPost?.author.username,
    )?.rank ?? null;

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <SiteHeader />
      <main>
        <Hero topPost={topPost} leader={leader} authorRank={authorRank} />
        <WhatIsAura />
        <HowItWorks />
        <TrendingPreview />
        <LeaderboardPreview
          entries={leaderboard?.entries ?? []}
          failed={leaderboardFailed}
        />
        <DownloadCta />
      </main>
      <SiteFooter />
    </Hydrate>
  );
}
