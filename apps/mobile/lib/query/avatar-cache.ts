import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { CursorPage, FeedCard, PostDetail, PublicProfile } from '@/lib/api/types';
import { isInfiniteCardQuery, queryKeys } from '@/lib/query/keys';

type InfiniteCards = InfiniteData<CursorPage<FeedCard>, string | null>;

function withAvatar(card: FeedCard, userId: string, avatarUrl: string): FeedCard {
  if (!card.author || card.author.id !== userId || card.author.avatarUrl === avatarUrl) {
    return card;
  }
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

  queryClient.setQueriesData<InfiniteCards>(
    { predicate: (query) => isInfiniteCardQuery(query.queryKey) },
    (current) => mapInfinite(current, input.userId, input.avatarUrl),
  );
  // `postVotes` is `['post', id, 'votes']`. A prefix match on `['post']`
  // would walk those ledger pages, read `author` on `{ pages, pageParams }`,
  // and throw — the crop screen then shows `errors.unknown` after a 200 complete.
  queryClient.setQueriesData<PostDetail>(
    { predicate: (query) => query.queryKey[0] === 'post' && query.queryKey.length === 2 },
    (current) =>
      current ? { ...withAvatar(current, input.userId, input.avatarUrl), status: current.status } : current,
  );
}
