import { apiGet, cursorQuery } from "./client";
import type {
  AuraApi,
  CursorPage,
  FeedCard,
  LeaderboardPage,
  Post,
} from "./types";

/** Real implementation of the public read surface. */
export const httpApi: AuraApi = {
  getFeed(params) {
    return apiGet<CursorPage<FeedCard>>("/v1/feed", {
      query: cursorQuery(params),
    });
  },

  getTrendingFeed(params) {
    return apiGet<CursorPage<FeedCard>>("/v1/feed/trending", {
      query: cursorQuery(params),
    });
  },

  getPost(postId) {
    return apiGet<Post>(`/v1/posts/${encodeURIComponent(postId)}`);
  },

  getGlobalLeaderboard(params) {
    return apiGet<LeaderboardPage>("/v1/leaderboards/global", {
      query: { limit: Math.min(params?.limit ?? 10, 100) },
    });
  },
};
