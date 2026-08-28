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

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <WhatIsAura />
        <HowItWorks />
        <TrendingPreview />
        <LeaderboardPreview />
        <DownloadCta />
      </main>
      <SiteFooter />
    </>
  );
}
