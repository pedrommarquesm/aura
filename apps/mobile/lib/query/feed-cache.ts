import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { CursorPage, FeedCard, LikeResult, PostDetail, PublicProfile } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

type InfiniteCards = InfiniteData<CursorPage<FeedCard>, string | null>;

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

function mapInfinite(
  current: InfiniteCards | undefined,
  postId: string,
  result: LikeResult,
): InfiniteCards | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === postId ? patchCard(item, result) : item)),
    })),
  };
}

/**
 * Writes a like/unlike into every list that already shows this post, plus the
 * permalink. The home feed was not enough — opening a post from a profile
 * reads `['post', id]` and the grid reads `['user', id, 'posts']`.
 */
export function applyLikeResult(queryClient: QueryClient, postId: string, result: LikeResult) {
  queryClient.setQueriesData<InfiniteCards>({ queryKey: queryKeys.feed.all }, (current) =>
    mapInfinite(current, postId, result),
  );
  queryClient.setQueriesData<InfiniteCards>(
    { predicate: (query) => query.queryKey[0] === 'user' && query.queryKey[2] === 'posts' },
    (current) => mapInfinite(current, postId, result),
  );

  let authorUsername: string | undefined;
  queryClient.setQueryData<PostDetail>(queryKeys.post(postId), (current) => {
    if (!current) return current;
    authorUsername = current.author.username;
    return { ...patchCard(current, result), status: current.status };
  });

  if (!authorUsername) {
    const detail = queryClient.getQueryData<PostDetail>(queryKeys.post(postId));
    authorUsername = detail?.author.username;
  }

  if (authorUsername) {
    queryClient.setQueryData<PublicProfile>(queryKeys.user(authorUsername), (current) =>
      current ? { ...current, aura: result.creatorAura } : current,
    );
  }
}
