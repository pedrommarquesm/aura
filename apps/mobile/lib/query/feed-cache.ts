import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { CursorPage, FeedCard, LikeResult } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

type FeedInfinite = InfiniteData<CursorPage<FeedCard>, string | null>;

function patchCard(card: FeedCard, result: LikeResult): FeedCard {
  if (card.likedByMe === result.liked && card.likeCount === result.likeCount) return card;

  return {
    ...card,
    likedByMe: result.liked,
    likeCount: result.likeCount,
    aura: result.postAura,
    author: { ...card.author, aura: result.creatorAura },
  };
}

/** Writes a like/unlike result into every cached feed ranking. */
export function applyLikeResult(queryClient: QueryClient, postId: string, result: LikeResult) {
  queryClient.setQueriesData<FeedInfinite>({ queryKey: queryKeys.feed.all }, (current) => {
    if (!current) return current;

    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => (item.id === postId ? patchCard(item, result) : item)),
      })),
    };
  });
}
