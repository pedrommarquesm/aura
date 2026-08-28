/**
 * Local mirror of the public API contract (architecture §6.4, §8.1, §11).
 *
 * These types are intentionally the only place the wire shape is described on
 * web. When `packages/contracts` lands (FND-04) this file becomes a re-export of
 * the Zod-inferred types and nothing else in the app has to change.
 */

/** Cursor pagination envelope used by every list endpoint. */
export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type CursorParams = {
  cursor?: string | null;
  /** Server default is 10, max 20. */
  limit?: number;
};

export type MediaType = "image" | "video";

export type PostMedia = {
  type: MediaType;
  /** CDN URL, already sized for the card. Never a storage key. */
  feedUrl: string;
  thumbUrl: string;
  hlsUrl?: string;
  width: number;
  height: number;
  durationMs?: number;
  blurhash?: string;
};

export type PostAuthor = {
  username: string;
  aura: number;
  title: string | null;
  avatarUrl: string | null;
};

/** One item of `GET /v1/feed` and `GET /v1/feed/trending`. */
export type FeedCard = {
  id: string;
  author: PostAuthor;
  media: PostMedia;
  caption: string;
  likeCount: number;
  /** Aura this post has earned, not the author's total. */
  aura: number;
  likedByMe: boolean;
};

/** `GET /v1/posts/:id` — a feed card plus the fields a permalink needs. */
export type Post = FeedCard & {
  publishedAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  user: PostAuthor;
  aura: number;
};

/**
 * `GET /v1/leaderboards/global` — top N plus the caller's own rank. `viewerRank`
 * is always null on web: the public surface has no session in V0.
 */
export type LeaderboardPage = CursorPage<LeaderboardEntry> & {
  viewerRank: LeaderboardEntry | null;
};

/** Every read the public web surface is allowed to make. */
export type AuraApi = {
  getTrendingFeed(params?: CursorParams): Promise<CursorPage<FeedCard>>;
  getPost(postId: string): Promise<Post>;
  getGlobalLeaderboard(params?: CursorParams): Promise<LeaderboardPage>;
};
