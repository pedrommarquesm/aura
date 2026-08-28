import { api } from './client';
import type { CursorPage, FeedCard, PublicProfile } from './types';

export const USER_POSTS_PAGE_SIZE = 12;

export function fetchPublicProfile(
  username: string,
  signal?: AbortSignal,
): Promise<PublicProfile> {
  const handle = username.startsWith('@') ? username.slice(1) : username;
  return api.get<PublicProfile>(`/users/${encodeURIComponent(handle)}`, {
    signal,
    anonymous: true,
  });
}

export function fetchUserPosts(
  userId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CursorPage<FeedCard>> {
  return api.get<CursorPage<FeedCard>>(`/users/${encodeURIComponent(userId)}/posts`, {
    query: { cursor, limit: USER_POSTS_PAGE_SIZE },
    signal,
  });
}
