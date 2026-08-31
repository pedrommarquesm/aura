import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { AboutIntro } from "@/components/about/about-intro";
import { Levels } from "@/components/about/levels";
import { AboutPrinciples } from "@/components/about/principles";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { WaitlistSection } from "@/components/landing/waitlist-section";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.about");

  return buildMetadata({
    locale,
    pathname: "/about",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <AboutIntro />
        <HowItWorks />
        <Levels />
        <AboutPrinciples />
        <WaitlistSection />
      </main>
      <SiteFooter />
    </>
  );
}
