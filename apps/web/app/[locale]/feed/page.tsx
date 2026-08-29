import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";

import { dehydrate } from "@tanstack/react-query";

import { FeedList } from "@/components/feed/feed-list";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container, Eyebrow } from "@/components/landing/section";
import type { CursorPage, FeedCard } from "@/lib/api/types";
import { loadFeedPage } from "@/lib/query/actions";
import { makeQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/lib/query/hydrate";
import { toInfinite } from "@/lib/query/infinite";
import { queryKeys } from "@/lib/query/keys";
import { buildMetadata } from "@/lib/seo";

/**
 * `[locale]` prerenders both locales at build time. A shared guest snapshot
 * would freeze `likedByMe: false` for signed-in viewers (WEB-19). The
 * permalink is outside this tree and already session-aware.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.feed");

  return buildMetadata({
    locale,
    pathname: "/feed",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function FeedPage() {
  // Wait for the incoming request so `getSession()` can read cookies.
  // Without this, Next prerenders a guest page and freezes empty hearts.
  await connection();
  const t = await getTranslations("feed.page");

  let page: CursorPage<FeedCard> | null = null;
  let failed = false;

  try {
    page = await loadFeedPage(null);
  } catch {
    failed = true;
  }

  const queryClient = makeQueryClient();
  if (page) {
    queryClient.setQueryData(
      queryKeys.feed.ranking("latest"),
      toInfinite(page),
    );
  }

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 py-16 sm:py-20">
          <Container className="flex max-w-2xl flex-col gap-4">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="text-title text-balance sm:text-display">
              {t("title")}
            </h1>
            <p className="text-body text-text-secondary">{t("description")}</p>
          </Container>
        </section>

        <Container className="py-12 sm:py-16">
          {failed ? (
            <p className="text-body text-text-secondary">{t("unavailable")}</p>
          ) : !page || page.items.length === 0 ? (
            <p className="text-body text-text-secondary">{t("empty")}</p>
          ) : (
            <FeedList />
          )}
        </Container>
      </main>
      <SiteFooter />
    </Hydrate>
  );
}
