import { DownloadCta } from "@/components/landing/download-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TrendingPreview } from "@/components/landing/trending-preview";
import { WhatIsAura } from "@/components/landing/what-is-aura";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ path: "/" });

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
