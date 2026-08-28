import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { FeedList } from "@/components/feed/feed-list";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container, Eyebrow } from "@/components/landing/section";
import { api } from "@/lib/api";
import { apiGet, cursorQuery } from "@/lib/api/client";
import { apiConfig } from "@/lib/api/config";
import type { CursorPage, FeedCard } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/seo";

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

async function loadInitialFeed(): Promise<CursorPage<FeedCard>> {
  const session = await getSession();
  const params = { limit: 12 };

  if (session && !apiConfig.useMock) {
    return apiGet<CursorPage<FeedCard>>("/v1/feed", {
      query: cursorQuery(params),
      accessToken: session.accessToken,
    });
  }

  return api.getFeed(params);
}

export default async function FeedPage() {
  const t = await getTranslations("feed.page");

  let page: CursorPage<FeedCard> | null = null;
  let failed = false;

  try {
    page = await loadInitialFeed();
  } catch {
    failed = true;
  }

  return (
    <>
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
            <FeedList
              initialItems={page.items}
              initialCursor={page.nextCursor}
              initialHasMore={page.hasMore}
            />
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
