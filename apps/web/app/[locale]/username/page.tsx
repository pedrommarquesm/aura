import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

export default async function UsernamePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; like?: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("auth.username");
  const { next, like } = await searchParams;
  const returnTo = safeReturnPath(next) ?? defaultSignedInPath(locale);
  const pendingLike = isPostId(like) ? like : null;
  const session = await getSession();

  if (!session) {
    redirect(authContinueHref(locale, "login", returnTo, pendingLike));
  }

  if (session && !session.needsUsername) {
    await applyPendingLike(session.accessToken, pendingLike);
    redirect(returnTo);
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
              <UsernameClaimForm next={returnTo} like={pendingLike} />
            </CardContent>
          </Card>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
