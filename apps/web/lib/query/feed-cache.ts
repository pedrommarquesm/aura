import type { QueryClient } from "@tanstack/react-query";

import type { FeedCard, LikeResult, Post } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

import type { FeedInfinite } from "./infinite";

function patchCard(card: FeedCard, result: LikeResult): FeedCard {
  if (card.likedByMe === result.liked && card.likeCount === result.likeCount) {
    return card;
  }

  return {
    ...card,
    likedByMe: result.liked,
    likeCount: result.likeCount,
    aura: result.postAura,
    author: { ...card.author, aura: result.creatorAura },
  };
}

function patchPost(post: Post, result: LikeResult): Post {
  return patchCard(post, result);
}

type LikeSnapshot = {
  likedByMe: boolean;
  likeCount: number;
  aura: number;
  authorAura: number;
};

function optimisticResult(current: LikeSnapshot, liked: boolean): LikeResult {
  const delta = liked === current.likedByMe ? 0 : liked ? 1 : -1;
  return {
    liked,
    likeCount: Math.max(0, current.likeCount + delta),
    postAura: Math.max(0, current.aura + delta * 10),
    creatorAura: Math.max(0, current.authorAura + delta * 10),
    actorAuraDelta: 0,
  };
}

function snapshotFromCache(
  queryClient: QueryClient,
  postId: string,
  fallback: LikeSnapshot,
): LikeSnapshot {
  const cached = queryClient.getQueryData<Post>(queryKeys.post(postId));
  if (cached) {
    return {
      likedByMe: cached.likedByMe,
      likeCount: cached.likeCount,
      aura: cached.aura,
      authorAura: cached.author.aura,
    };
  }

  const feeds = queryClient.getQueriesData<FeedInfinite<FeedCard>>({
    queryKey: queryKeys.feed.all,
  });
  for (const [, data] of feeds) {
    const card = data?.pages
      .flatMap((page) => page.items)
      .find((item) => item.id === postId);
    if (card) {
      return {
        likedByMe: card.likedByMe,
        likeCount: card.likeCount,
        aura: card.aura,
        authorAura: card.author.aura,
      };
    }
  }

  return fallback;
}

/** Writes a like into every cached feed ranking and the permalink. */
export function applyLikeResult(
  queryClient: QueryClient,
  postId: string,
  result: LikeResult,
) {
  queryClient.setQueriesData<FeedInfinite<FeedCard>>(
    { queryKey: queryKeys.feed.all },
    (current) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === postId ? patchCard(item, result) : item,
          ),
        })),
      };
    },
  );

  queryClient.setQueryData<Post>(queryKeys.post(postId), (current) =>
    current ? patchPost(current, result) : current,
  );
}

export function applyOptimisticLike(
  queryClient: QueryClient,
  postId: string,
  liked: boolean,
  fallback: LikeSnapshot,
) {
  applyLikeResult(
    queryClient,
    postId,
    optimisticResult(snapshotFromCache(queryClient, postId, fallback), liked),
  );
}
