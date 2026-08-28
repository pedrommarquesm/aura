/**
 * Wire types for the documented V0 API surface (architecture §6.4, §8.1, §11).
 *
 * These are hand-written on purpose: `packages/contracts` (roadmap `FND-04`) will
 * own the shared Zod schemas, and this file should be deleted in favour of the
 * inferred types when it lands.
 */

/** Every list endpoint is cursor-paginated. Offsets are never used (§8.1). */
export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type MediaType = 'photo' | 'video';

export type FeedMedia = {
  type: MediaType;
  /** Low-resolution placeholder, already sized for the card. Null until processed. */
  thumbUrl: string | null;
  feedUrl: string | null;
  posterUrl?: string | null;
  /** Videos only. */
  hlsUrl?: string | null;
  width: number | null;
  height: number | null;
  durationMs?: number | null;
};

export type FeedAuthor = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
  aura: number;
  /** Cosmetic level title (§20). Null below the first threshold. */
  title: string | null;
};

export type FeedCard = {
  id: string;
  author: FeedAuthor;
  media: FeedMedia;
  caption: string | null;
  likeCount: number;
  /** Aura this post has earned, not the author's total. */
  aura: number;
  likedByMe: boolean;
  createdAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
};

export type LeaderboardPage = {
  entries: LeaderboardEntry[];
  viewer: LeaderboardEntry | null;
  total: number;
};

export type AuthTokens = {
  /** Short-lived JWT. Memory only — never SecureStore, never AsyncStorage (§12.5). */
  accessToken: string;
  /** Opaque, rotated on every use. Lives in SecureStore. */
  refreshToken: string;
  expiresIn?: number;
};

/** `GET /auth/me` and the `user` half of a sign-in response. */
export type PublicUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
  locale: string;
};

export type SignInResponse = AuthTokens & {
  needsUsername: boolean;
  user: PublicUser;
};

export type LikeResult = {
  liked: boolean;
  likeCount: number;
  postAura: number;
  creatorAura: number;
  actorAuraDelta: number;
};

export type CreateUploadRequest = {
  contentType: string;
  byteSize: number;
  checksum?: string;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type CreateUploadResponse = {
  postId: string;
  assetId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  method: 'PUT';
  maxBytes: number;
  expiresAt: string;
};

export type CompleteUploadResponse = {
  postId: string;
  status: 'processing' | 'published';
};

export type PostDetail = FeedCard & {
  status: 'uploading' | 'processing' | 'published' | 'failed' | 'removed';
};

