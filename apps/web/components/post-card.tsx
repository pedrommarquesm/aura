"use client";

import Link from "next/link";

import { LikeButton } from "@/components/feed/like-button";
import { LikeableMedia } from "@/components/feed/likeable-media";
import { PostMedia } from "@/components/post-media";
import { AuraValue, Avatar, Card } from "@/components/ui";
import type { FeedCard } from "@/lib/api";
import { useLikePost } from "@/lib/likes/use-like-post";
import { publicPostPath } from "@/lib/share";

export function PostCard({
  post,
  priority = false,
}: {
  post: FeedCard;
  priority?: boolean;
}) {
  const href = publicPostPath(post.author.username, post.id);
  const like = useLikePost({
    postId: post.id,
    likeCount: post.likeCount,
    initiallyLiked: post.likedByMe,
    aura: post.aura,
    authorAura: post.author.aura,
  });

  return (
    <Card interactive className="flex h-full flex-col overflow-hidden">
      <LikeableMedia href={href} burst={like.burst} onLike={like.likeOnly}>
        <PostMedia
          media={post.media}
          alt={post.caption ?? `@${post.author.username}`}
          priority={priority}
          sizes="(min-width: 1024px) 352px, (min-width: 640px) 45vw, 90vw"
          className="aspect-4/5"
        />
      </LikeableMedia>

      <Link href={href} className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 p-4 pb-0">
          <div className="flex items-center gap-3">
            <Avatar username={post.author.username} src={post.author.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-label">@{post.author.username}</p>
              <AuraValue value={like.authorAura} size="sm" tone="secondary" />
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
        <LikeButton
          liked={like.liked}
          likeCount={like.likeCount}
          burst={like.burst}
          error={like.error}
          onToggle={like.toggle}
        />
        <AuraValue value={like.aura} size="md" tone="aura" />
      </div>
    </Card>
  );
}
