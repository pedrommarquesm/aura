import { ApiError } from "@/lib/api/errors";
import type { CursorPage, FeedCard, Post } from "@/lib/api/types";
import { toInfinite, type FeedInfinite } from "@/lib/query/infinite";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      throw new ApiError(
        response.status,
        body.error?.code ?? "unknown_error",
        body.error?.message ?? response.statusText,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(response.status, "unknown_error", response.statusText);
    }
  }

  return (await response.json()) as T;
}

export function fetchFeedPage(
  cursor: string | null,
): Promise<CursorPage<FeedCard>> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return getJson<CursorPage<FeedCard>>(query ? `/api/feed?${query}` : "/api/feed");
}

export async function fetchTrendingInfinite(
  limit = 6,
): Promise<FeedInfinite<FeedCard>> {
  const params = new URLSearchParams({
    ranking: "trending",
    limit: String(limit),
  });
  return toInfinite(
    await getJson<CursorPage<FeedCard>>(`/api/feed?${params}`),
  );
}

export async function fetchPostById(postId: string): Promise<Post | null> {
  try {
    return await getJson<Post>(`/api/posts/${encodeURIComponent(postId)}`);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}
