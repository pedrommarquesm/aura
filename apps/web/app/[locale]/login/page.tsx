import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
import {
  authContinueHref,
  defaultSignedInPath,
  safeReturnPath,
} from "@/lib/auth/return-to";
import { getSession } from "@/lib/auth/session";
import { isPostId } from "@/lib/likes/ids";
import { applyPendingLike } from "@/lib/likes/server";
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
  });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; like?: string }>;
}) {
  const locale = await getLocale();
  const { next, like } = await searchParams;
  const returnTo = safeReturnPath(next) ?? defaultSignedInPath(locale);
  const pendingLike = isPostId(like) ? like : null;
  const session = await getSession();

  if (session?.needsUsername) {
    redirect(authContinueHref(locale, "username", returnTo, pendingLike));
  }

  if (session) {
    await applyPendingLike(session.accessToken, pendingLike);
    redirect(returnTo);
  }

  const t = pendingLike
    ? await getTranslations("auth.reasons.like")
    : await getTranslations("auth.page");

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
              <LoginForm next={returnTo} like={pendingLike} />
            </CardContent>
          </Card>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
