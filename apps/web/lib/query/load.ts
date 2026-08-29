import { api } from "@/lib/api";
import { apiGet, cursorQuery } from "@/lib/api/client";
import { apiConfig } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import type {
  CursorPage,
  FeedCard,
  LeaderboardPage,
  Post,
} from "@/lib/api/types";

function asGuest(accessToken: string | null) {
  return !accessToken || apiConfig.useMock;
}

export async function readFeedPage(
  cursor: string | null,
  accessToken: string | null,
): Promise<CursorPage<FeedCard>> {
  const params = { cursor, limit: 12 };
  if (asGuest(accessToken)) return api.getFeed(params);
  return apiGet<CursorPage<FeedCard>>("/v1/feed", {
    query: cursorQuery(params),
    accessToken,
  });
}

export async function readTrendingPage(
  limit: number,
  accessToken: string | null,
): Promise<CursorPage<FeedCard>> {
  const params = { limit };
  if (asGuest(accessToken)) return api.getTrendingFeed(params);
  return apiGet<CursorPage<FeedCard>>("/v1/feed/trending", {
    query: cursorQuery(params),
    accessToken,
  });
}

export async function readPostById(
  postId: string,
  accessToken: string | null,
): Promise<Post | null> {
  try {
    if (asGuest(accessToken)) return await api.getPost(postId);
    return await apiGet<Post>(`/v1/posts/${encodeURIComponent(postId)}`, {
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function readLeaderboardPage(
  limit: number,
  accessToken: string | null,
): Promise<LeaderboardPage> {
  if (asGuest(accessToken)) return api.getGlobalLeaderboard({ limit });
  return apiGet<LeaderboardPage>("/v1/leaderboards/global", {
    query: { limit },
    accessToken,
  });
}
