import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { CursorPage, FeedCard, PostDetail, PublicProfile } from '@/lib/api';
import { isInfiniteCardQuery, queryKeys } from '@/lib/query/keys';

type InfiniteCards = InfiniteData<CursorPage<FeedCard>, string | null>;

function mapInfinite(
  current: InfiniteCards | undefined,
  mapItem: (item: FeedCard) => FeedCard,
): InfiniteCards | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map(mapItem),
    })),
  };
}

function filterInfinite(
  current: InfiniteCards | undefined,
  keep: (item: FeedCard) => boolean,
): InfiniteCards | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.filter(keep),
    })),
  };
}

function patchLists(queryClient: QueryClient, mapItem: (item: FeedCard) => FeedCard) {
  queryClient.setQueriesData<InfiniteCards>(
    { predicate: (query) => isInfiniteCardQuery(query.queryKey) },
    (current) => mapInfinite(current, mapItem),
  );
}

/** Caption edit lands in every list that already shows this post. */
export function applyCaptionUpdate(queryClient: QueryClient, postId: string, caption: string | null) {
  patchLists(queryClient, (item) => (item.id === postId ? { ...item, caption } : item));
  queryClient.setQueryData<PostDetail>(queryKeys.post(postId), (current) =>
    current ? { ...current, caption } : current,
  );
}

/** Soft-delete: drop the card and tick the author's public post count down. */
export function applyPostRemoved(
  queryClient: QueryClient,
  postId: string,
  author: { id: string; username: string },
) {
  queryClient.setQueriesData<InfiniteCards>(
    { predicate: (query) => isInfiniteCardQuery(query.queryKey) },
    (current) => filterInfinite(current, (item) => item.id !== postId),
  );
  queryClient.removeQueries({ queryKey: queryKeys.post(postId) });
  queryClient.setQueryData<PublicProfile>(queryKeys.user(author.username), (current) =>
    current ? { ...current, postCount: Math.max(0, current.postCount - 1) } : current,
  );
}
