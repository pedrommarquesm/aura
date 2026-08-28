/**
 * Local mirror of the public API contract (architecture §6.4, §8.1, §11).
 *
 * These types are intentionally the only place the wire shape is described on
 * web. When `packages/contracts` lands (FND-04) this file becomes a re-export of
 * the Zod-inferred types and nothing else in the app has to change.
 */

/** Cursor pagination envelope used by feed endpoints. */
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

export type MediaType = "photo" | "video";

export type PostMedia = {
  type: MediaType;
  /** CDN URL, already sized for the card. Never a storage key. Null until processed. */
  feedUrl: string | null;
  thumbUrl: string | null;
  posterUrl?: string | null;
  hlsUrl?: string | null;
  width: number | null;
  height: number | null;
  durationMs?: number | null;
  blurhash?: string;
};

export type PostAuthor = {
  id?: string;
  username: string;
  displayName?: string | null;
  aura: number;
  title: string | null;
  avatarUrl: string | null;
};

/** One item of `GET /v1/feed` and `GET /v1/feed/trending`. */
export type FeedCard = {
  id: string;
  createdAt: string;
  author: PostAuthor;
  media: PostMedia;
  caption: string | null;
  likeCount: number;
  /** Aura this post has earned, not the author's total. */
  aura: number;
  likedByMe: boolean;
};

/** `GET /v1/posts/:id` — the permalink is the feed card. */
export type Post = FeedCard;

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
};

/**
 * `GET /v1/leaderboards/global` — top N plus the caller's own rank. `viewer`
 * is filled when the request carries a session.
 */
export type LeaderboardPage = {
  entries: LeaderboardEntry[];
  viewer: LeaderboardEntry | null;
  total: number;
};

export type PublicUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
  locale: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type SignInResponse = AuthTokens & {
  needsUsername: boolean;
  user: PublicUser;
};

/** Reads the public web surface is allowed to make. Auth is a separate BFF. */
export type AuraApi = {
  getFeed(params?: CursorParams): Promise<CursorPage<FeedCard>>;
  getTrendingFeed(params?: CursorParams): Promise<CursorPage<FeedCard>>;
  getPost(postId: string): Promise<Post>;
  getGlobalLeaderboard(params?: { limit?: number }): Promise<LeaderboardPage>;
};
