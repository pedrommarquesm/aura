import { apiGet, cursorQuery } from "./client";
import type {
  AuraApi,
  CursorPage,
  FeedCard,
  LeaderboardPage,
  Post,
} from "./types";

/** Real implementation. Unused until the API is deployed; see `./index.ts`. */
export const httpApi: AuraApi = {
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
      query: cursorQuery(params),
    });
  },
};
