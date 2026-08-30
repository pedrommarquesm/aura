import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { CursorPage, FeedCard, PostDetail, PublicProfile } from '@/lib/api/types';
import { queryKeys } from '@/lib/query/keys';

type InfiniteCards = InfiniteData<CursorPage<FeedCard>, string | null>;

function withAvatar(card: FeedCard, userId: string, avatarUrl: string): FeedCard {
  if (card.author.id !== userId || card.author.avatarUrl === avatarUrl) return card;
  return { ...card, author: { ...card.author, avatarUrl } };
}

function mapInfinite(
  current: InfiniteCards | undefined,
  userId: string,
  avatarUrl: string,
): InfiniteCards | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => withAvatar(item, userId, avatarUrl)),
    })),
  };
}

/** Writes a new profile photo onto the session card, feed authors, and permalinks. */
export function applyAvatarUrl(
  queryClient: QueryClient,
  input: { userId: string; username: string; avatarUrl: string },
) {
  queryClient.setQueryData<PublicProfile>(queryKeys.user(input.username), (current) =>
    current ? { ...current, avatarUrl: input.avatarUrl } : current,
  );

  queryClient.setQueriesData<InfiniteCards>({ queryKey: queryKeys.feed.all }, (current) =>
    mapInfinite(current, input.userId, input.avatarUrl),
  );
  queryClient.setQueriesData<InfiniteCards>(
    { predicate: (query) => query.queryKey[0] === 'user' && query.queryKey[2] === 'posts' },
    (current) => mapInfinite(current, input.userId, input.avatarUrl),
  );
  queryClient.setQueriesData<PostDetail>({ queryKey: ['post'] }, (current) =>
    current ? { ...withAvatar(current, input.userId, input.avatarUrl), status: current.status } : current,
  );
}
