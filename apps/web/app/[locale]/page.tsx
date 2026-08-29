import type { Metadata } from "next";
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

import { makeQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/lib/query/hydrate";
import { toInfinite } from "@/lib/query/infinite";
import { queryKeys } from "@/lib/query/keys";
import { readLeaderboardPage, readTrendingPage } from "@/lib/query/load";
import { buildMetadata } from "@/lib/seo";

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
  // Guest snapshot only — `getSession()` / `cookies()` here would bind the
  // whole marketing page to the JWT. A like fetch then refreshes the RSC
  // tree and the scroll jumps to the top (WEB-18). Signed-in hearts come
  // from `useRefetchFeedWhenSignedIn` on the trending grid.
  const queryClient = makeQueryClient();
  const [trendingResult, leaderboardResult] = await Promise.allSettled([
    readTrendingPage(6, null),
    readLeaderboardPage(10, null),
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
