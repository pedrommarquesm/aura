import { getSession } from "@/lib/auth/session";
import {
  readFeedPage,
  readLeaderboardPage,
  readPostById,
  readTrendingPage,
} from "@/lib/query/load";

async function accessToken() {
  const session = await getSession();
  return session?.accessToken ?? null;
}

/** RSC first page. Do not call these from the browser — that is a Server Action and Next will refresh the page. */
export async function loadFeedPage(cursor: string | null) {
  return readFeedPage(cursor, await accessToken());
}

export async function loadTrendingPage(limit = 6) {
  return readTrendingPage(limit, await accessToken());
}

export async function loadPostById(postId: string) {
  return readPostById(postId, await accessToken());
}

export async function loadLeaderboardPage(limit = 100) {
  return readLeaderboardPage(limit, await accessToken());
}
