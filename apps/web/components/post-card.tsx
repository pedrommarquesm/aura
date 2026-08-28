import { useFormatter, useTranslations } from "next-intl";

import { HeartIcon } from "@/components/icons";
import { PostMedia } from "@/components/post-media";
import { AuraValue, Avatar, Card } from "@/components/ui";
import type { FeedCard } from "@/lib/api";
import { formatCount } from "@/lib/format";

export function PostCard({
  post,
  priority = false,
}: {
  post: FeedCard;
  priority?: boolean;
}) {
  const format = useFormatter();
  const t = useTranslations("feed.post");

  return (
    <Card interactive className="flex flex-col overflow-hidden">
      <PostMedia
        media={post.media}
        alt={post.caption}
        priority={priority}
        sizes="(min-width: 1024px) 352px, (min-width: 640px) 45vw, 90vw"
        className="aspect-4/5"
      />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar username={post.author.username} src={post.author.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-label">@{post.author.username}</p>
            <AuraValue value={post.author.aura} size="sm" tone="secondary" />
          </div>
        </div>

        {/* The caption is user content and stays in the language it was
            written in. */}
        <p className="text-body text-text-secondary">{post.caption}</p>

        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-3">
          <span className="inline-flex items-center gap-1.5 text-label text-text-secondary">
            <HeartIcon className="size-4 text-like" />
            <span aria-hidden>{formatCount(format, post.likeCount)}</span>
            <span className="sr-only">
              {t("likes", { count: post.likeCount })}
            </span>
          </span>
          <AuraValue value={post.aura} size="md" tone="aura" />
        </div>
      </div>
    </Card>
  );
}
