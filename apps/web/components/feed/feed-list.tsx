"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui";
import { loadFeedPage } from "@/lib/auth/feed-actions";
import type { FeedCard } from "@/lib/api/types";

export function FeedList({
  initialItems,
  initialCursor,
  initialHasMore,
}: {
  initialItems: FeedCard[];
  initialCursor: string | null;
  initialHasMore: boolean;
}) {
  const t = useTranslations();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    if (!cursor || busy) return;
    setBusy(true);
    setError(null);

    try {
      const page = await loadFeedPage(cursor);
      setItems((current) => [
        ...current,
        ...page.items.filter(
          (post) => !current.some((existing) => existing.id === post.id),
        ),
      ]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      setError(t("feed.page.unavailable"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post, index) => (
          <PostCard key={post.id} post={post} priority={index < 3} />
        ))}
      </div>

      {error ? (
        <p className="text-center text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void loadMore()}
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
