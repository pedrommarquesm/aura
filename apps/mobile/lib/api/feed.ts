import { api } from './client';
import type { CursorPage, FeedCard } from './types';

export type FeedRanking = 'latest' | 'trending';

const FEED_PATHS: Record<FeedRanking, string> = {
  latest: '/feed',
  trending: '/feed/trending',
};

/** §8.1: default 10, server maximum 20. */
export const FEED_PAGE_SIZE = 10;

export function fetchFeedPage(
  ranking: FeedRanking,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CursorPage<FeedCard>> {
  return api.get<CursorPage<FeedCard>>(FEED_PATHS[ranking], {
    query: { cursor, limit: FEED_PAGE_SIZE },
    signal,
  });
}
