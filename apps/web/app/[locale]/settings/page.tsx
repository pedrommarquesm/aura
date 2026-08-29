import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container, Eyebrow } from "@/components/landing/section";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.settings");

  return buildMetadata({
    locale,
    pathname: "/settings",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="flex max-w-md flex-col py-20 sm:py-28">
          <Eyebrow>{t("title")}</Eyebrow>
          <h1 className="mt-4 text-title text-balance sm:text-display">{t("title")}</h1>
          <p className="mt-3 text-body text-text-secondary">{t("body")}</p>

          <Card className="mt-10">
            <CardHeader>
              <CardTitle>{t("language.title")}</CardTitle>
              <CardDescription>{t("language.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <LocaleSwitcher />
            </CardContent>
          </Card>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
