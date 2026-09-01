"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { PostMedia } from "@/components/post-media";
import { AuraValue, Avatar, Card } from "@/components/ui";
import type { FeedCard } from "@/lib/api";
import { publicPostPath } from "@/lib/share";

/**
 * Read-only on web (docs/redesign-tracker.md Q12) — voting is a mobile
 * slider gesture. The card shows the post's live, signed Aura score; it
 * never writes a vote.
 */
export function PostCard({
  post,
  priority = false,
}: {
  post: FeedCard;
  priority?: boolean;
}) {
  const t = useTranslations("feed.post");
  const href = publicPostPath(post.author.username, post.id);

  return (
    <Card interactive className="flex h-full flex-col overflow-hidden">
      <Link href={href}>
        <PostMedia
          media={post.media}
          alt={post.caption ?? `@${post.author.username}`}
          priority={priority}
          sizes="(min-width: 1024px) 352px, (min-width: 640px) 45vw, 90vw"
          className="aspect-4/5"
        />
      </Link>

      <Link href={href} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 p-4 pb-0">
          <div className="flex items-center gap-3">
            <Avatar username={post.author.username} src={post.author.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-label">@{post.author.username}</p>
              <AuraValue value={post.author.aura} size="sm" tone="secondary" />
            </div>
          </div>

          {/* The caption is user content and stays in the language it was
              written in. */}
          {post.caption ? (
            <p className="text-body text-text-secondary">{post.caption}</p>
          ) : null}
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 p-4 pt-3">
        <span className="text-label text-text-secondary">
          {t("voteCount", { count: post.voteCount })}
        </span>
        <AuraValue value={post.aura} size="md" tone={post.aura >= 0 ? "aura" : "danger"} />
      </div>
    </Card>
  );
}
