"use client";

import { createContext, useContext, type ReactNode } from "react";

import { LikeButton } from "@/components/feed/like-button";
import { LikeableMedia } from "@/components/feed/likeable-media";
import { AuraValue } from "@/components/ui";
import type { Post } from "@/lib/api";
import { useLikePost } from "@/lib/likes/use-like-post";

type LikeControls = ReturnType<typeof useLikePost>;

const PublicPostLikeContext = createContext<LikeControls | null>(null);

function usePublicPostLike() {
  const value = useContext(PublicPostLikeContext);
  if (!value) {
    throw new Error("Public post like controls are missing.");
  }
  return value;
}

export function PublicPostLikeScope({
  post,
  children,
}: {
  post: Post;
  children: ReactNode;
}) {
  const like = useLikePost({
    postId: post.id,
    likeCount: post.likeCount,
    initiallyLiked: post.likedByMe,
    aura: post.aura,
    authorAura: post.author.aura,
  });

  return (
    <PublicPostLikeContext.Provider value={like}>
      {children}
    </PublicPostLikeContext.Provider>
  );
}

export function PublicLikeableMedia({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const like = usePublicPostLike();

  return (
    <LikeableMedia className={className} burst={like.burst} onLike={like.likeOnly}>
      {children}
    </LikeableMedia>
  );
}

export function PublicPostLikeRow() {
  const like = usePublicPostLike();

  return (
    <div className="flex items-center justify-between border-t border-border/70 pt-4">
      <LikeButton
        liked={like.liked}
        likeCount={like.likeCount}
        burst={like.burst}
        error={like.error}
        onToggle={like.toggle}
      />
      <AuraValue value={like.aura} size="lg" tone="aura" />
    </div>
  );
}
