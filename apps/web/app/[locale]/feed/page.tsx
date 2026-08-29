import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

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
    <Hydrate client={queryClient}>
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
