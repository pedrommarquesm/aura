import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { DemoShowcase } from "@/components/landing/demo-showcase";
import { FeatureCards } from "@/components/landing/feature-cards";
import { Hero } from "@/components/landing/hero";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
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
        <DemoShowcase />
        <FeatureCards />
      </main>
      <SiteFooter />
    </>
  );
}
