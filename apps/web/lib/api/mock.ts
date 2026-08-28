import { apiConfig } from "./config";
import { ApiError } from "./errors";
import { mockLeaderboard, mockPosts, mockTrendingFeed } from "./mock-data";
import type {
  AuraApi,
  CursorPage,
  CursorParams,
  LeaderboardPage,
} from "./types";

/**
 * Cursor here is just the index of the next item, encoded so callers cannot
 * treat it as meaningful. The real API returns an opaque signed cursor.
 */
function paginate<T>(items: T[], { cursor, limit }: CursorParams): CursorPage<T> {
  const offset = cursor ? Number.parseInt(atob(cursor), 10) : 0;
  const start = Number.isNaN(offset) ? 0 : offset;
  const size = Math.min(limit ?? apiConfig.defaultLimit, apiConfig.maxLimit);
  const page = items.slice(start, start + size);
  const nextStart = start + page.length;
  const hasMore = nextStart < items.length;

  return {
    items: page,
    nextCursor: hasMore ? btoa(String(nextStart)) : null,
    hasMore,
  };
}

export const mockApi: AuraApi = {
  async getTrendingFeed(params = {}) {
    return paginate(mockTrendingFeed, params);
  },

  async getPost(postId) {
    const post = mockPosts.find((candidate) => candidate.id === postId);
    if (!post) {
      throw new ApiError(404, "post_not_found", `No post with id ${postId}`);
    }
    return post;
  },

  async getGlobalLeaderboard(params = {}): Promise<LeaderboardPage> {
    return { ...paginate(mockLeaderboard, params), viewerRank: null };
  },
};
