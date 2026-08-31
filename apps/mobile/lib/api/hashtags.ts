import { api } from './client';
import type { CursorPage, FeedCard } from './types';

export const HASHTAG_PAGE_SIZE = 12;

export function fetchHashtagPage(
  tag: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CursorPage<FeedCard>> {
  return api.get<CursorPage<FeedCard>>(`/hashtags/${encodeURIComponent(tag)}`, {
    query: { cursor, limit: HASHTAG_PAGE_SIZE },
    signal,
  });
}
