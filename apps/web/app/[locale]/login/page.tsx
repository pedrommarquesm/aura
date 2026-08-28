import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LoginForm } from "./login-form";
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
  const t = await getTranslations("meta.login");

  return buildMetadata({
    locale,
    pathname: "/login",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function LoginPage() {
  const locale = await getLocale();
  const t = await getTranslations("auth.page");
  const session = await getSession();

  if (session?.needsUsername) {
    redirect({ href: "/username", locale });
  }

  if (session) {
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
              <LoginForm />
            </CardContent>
          </Card>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
