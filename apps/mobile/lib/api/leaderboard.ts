import { api } from './client';
import type { LeaderboardPage } from './types';

/** `GET /v1/leaderboards/global` — limit only, no cursor. Max 100. */
export const LEADERBOARD_PAGE_SIZE = 100;

export function fetchGlobalLeaderboard(
  limit: number = LEADERBOARD_PAGE_SIZE,
  signal?: AbortSignal,
): Promise<LeaderboardPage> {
  return api.get<LeaderboardPage>('/leaderboards/global', {
    query: { limit: Math.min(limit, 100) },
    signal,
  });
}
