"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui";
import { loadFeedPage } from "@/lib/query/actions";
import { queryKeys } from "@/lib/query/keys";

export function FeedList() {
  const t = useTranslations();
  const query = useInfiniteQuery({
    queryKey: queryKeys.feed.ranking("latest"),
    queryFn: ({ pageParam }) => loadFeedPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  const items =
    query.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (post, index, all) =>
          all.findIndex((other) => other.id === post.id) === index,
      ) ?? [];

  const failed = query.isError && items.length === 0;
  const loadMoreFailed = query.isFetchNextPageError;

  return (
    <div className="flex flex-col gap-8">
      {failed ? (
        <p className="text-center text-caption text-danger" role="alert">
          {t("feed.page.unavailable")}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post, index) => (
            <PostCard key={post.id} post={post} priority={index < 3} />
          ))}
        </div>
      )}

      {loadMoreFailed ? (
        <p className="text-center text-caption text-danger" role="alert">
          {t("feed.page.unavailable")}
        </p>
      ) : null}

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t("common.actions.loadMore")}
          </Button>
        </div>
      ) : items.length > 0 ? (
        <p className="text-center text-caption text-text-muted">
          {t("feed.page.end")}
        </p>
      ) : null}
    </div>
  );
}
