"use server";

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
import { getSession } from "@/lib/auth/session";

async function withSession<T>(
  guest: () => Promise<T>,
  authed: (accessToken: string) => Promise<T>,
): Promise<T> {
  const session = await getSession();
  if (!session || apiConfig.useMock) return guest();
  return authed(session.accessToken);
}

export async function loadFeedPage(
  cursor: string | null,
): Promise<CursorPage<FeedCard>> {
  const params = { cursor, limit: 12 };

  return withSession(
    () => api.getFeed(params),
    (accessToken) =>
      apiGet<CursorPage<FeedCard>>("/v1/feed", {
        query: cursorQuery(params),
        accessToken,
      }),
  );
}

export async function loadTrendingPage(
  limit = 6,
): Promise<CursorPage<FeedCard>> {
  const params = { limit };

  return withSession(
    () => api.getTrendingFeed(params),
    (accessToken) =>
      apiGet<CursorPage<FeedCard>>("/v1/feed/trending", {
        query: cursorQuery(params),
        accessToken,
      }),
  );
}

export async function loadPostById(postId: string): Promise<Post | null> {
  try {
    return await withSession(
      () => api.getPost(postId),
      (accessToken) =>
        apiGet<Post>(`/v1/posts/${encodeURIComponent(postId)}`, {
          accessToken,
        }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function loadLeaderboardPage(
  limit = 100,
): Promise<LeaderboardPage> {
  return withSession(
    () => api.getGlobalLeaderboard({ limit }),
    (accessToken) =>
      apiGet<LeaderboardPage>("/v1/leaderboards/global", {
        query: { limit },
        accessToken,
      }),
  );
}
