import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

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
import {
  authContinueHref,
  defaultSignedInPath,
  safeReturnPath,
} from "@/lib/auth/return-to";
import { getSession } from "@/lib/auth/session";
import { webAuthEnabled } from "@/lib/launch";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.login");

  return buildMetadata({
    locale,
    pathname: "/login",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
    noIndex: !webAuthEnabled,
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!webAuthEnabled) {
    redirect("/");
  }

  const locale = await getLocale();
  const { next } = await searchParams;
  const returnTo = safeReturnPath(next) ?? defaultSignedInPath(locale);
  const session = await getSession();

  if (session?.needsUsername) {
    redirect(authContinueHref(locale, "username", returnTo));
  }

  if (session) {
    redirect(returnTo);
  }

  const t = await getTranslations("auth.page");

  const { LoginForm } = await import("./login-form");

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
              <LoginForm next={returnTo} />
            </CardContent>
          </Card>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
