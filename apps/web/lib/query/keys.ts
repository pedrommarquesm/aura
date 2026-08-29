/**
 * Every query key is built here so invalidation stays greppable.
 * Hierarchical, matching mobile (`apps/mobile/lib/query/keys.ts`) where the
 * meaning is the same — FND-03 can merge the catalogs later.
 */
export type FeedRanking = "latest" | "trending";

export const queryKeys = {
  feed: {
    all: ["feed"] as const,
    ranking: (ranking: FeedRanking) => ["feed", ranking] as const,
  },
  post: (id: string) => ["post", id] as const,
  me: ["me"] as const,
  leaderboard: {
    all: ["leaderboard"] as const,
    global: (limit: number) => ["leaderboard", "global", limit] as const,
  },
};
