"use server";

import { api } from "@/lib/api";
import { apiGet, cursorQuery } from "@/lib/api/client";
import { apiConfig } from "@/lib/api/config";
import type { CursorPage, FeedCard } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";

export async function loadFeedPage(
  cursor: string | null,
): Promise<CursorPage<FeedCard>> {
  const session = await getSession();
  const params = { cursor, limit: 12 };

  if (!session) {
    return api.getFeed(params);
  }

  if (apiConfig.useMock) {
    return api.getFeed(params);
  }

  return apiGet<CursorPage<FeedCard>>("/v1/feed", {
    query: cursorQuery(params),
    accessToken: session.accessToken,
  });
}
