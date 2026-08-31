import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { HowItWorks } from "@/components/landing/how-it-works";
import { Hero } from "@/components/landing/hero";
import { Play } from "@/components/landing/play";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { WaitlistSection } from "@/components/landing/waitlist-section";
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
        <WaitlistSection />
        <Play />
        <WhatIsAura />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
