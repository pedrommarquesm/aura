"use client";

import { useQuery } from "@tanstack/react-query";

import { LikeButton } from "@/components/feed/like-button";
import { AuraValue } from "@/components/ui";
import { loadPostById } from "@/lib/query/actions";
import { queryKeys } from "@/lib/query/keys";

export function PublicPostLikeRow({ postId }: { postId: string }) {
  const { data: post } = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => loadPostById(postId),
  });

  if (!post) return null;

  return (
    <div className="flex items-center justify-between border-t border-border/70 pt-4">
      <LikeButton
        postId={post.id}
        likeCount={post.likeCount}
        initiallyLiked={post.likedByMe}
        aura={post.aura}
        authorAura={post.author.aura}
      />
      <AuraValue value={post.aura} size="lg" tone="aura" />
    </div>
  );
}
