import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { UsernameClaimForm } from "./username-claim-form";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container } from "@/components/landing/section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { getSession } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/seo";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.username");

  return buildMetadata({
    locale,
    pathname: "/username",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
    noIndex: true,
  });
}

export default async function UsernamePage() {
  const locale = await getLocale();
  const t = await getTranslations("auth.username");
  const session = await getSession();

  if (!session) {
    redirect({ href: "/login", locale });
  }

  if (session && !session.needsUsername) {
    redirect({ href: "/feed", locale });
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="flex max-w-md flex-col py-20 sm:py-28">
          <Card>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("body")}</CardDescription>
            </CardHeader>
            <CardContent>
              <UsernameClaimForm />
            </CardContent>
          </Card>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
