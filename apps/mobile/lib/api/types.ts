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
  voteCount: number;
  /** Signed. This post may be in Aura Debt (negative). Not the author's total. */
  aura: number;
  votedByMe: boolean;
  /** The viewer's own vote amount, if they cast one. There is no unvote. */
  myAmount: number | null;
  createdAt: string;
};

export type VoteAuthor = FeedAuthor;

/** One row on the receipt ledger. Every vote appears here, with or without text. */
export type VoteReceipt = {
  amount: number;
  receipt: string | null;
  createdAt: string;
  author: VoteAuthor;
};

export type CastVoteResult = {
  amount: number;
  receipt: string | null;
  createdAt: string;
  voteCount: number;
  postAura: number;
  creatorAura: number;
  /** True when the caller had already voted — `amount` above is the original, unchanged. */
  alreadyVoted: boolean;
};

export type SetReceiptResult = {
  amount: number;
  receipt: string;
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

/** `GET /v1/users/:username` — public competitive card. */
export type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
  rank: number;
  postCount: number;
};

export type SignInResponse = AuthTokens & {
  needsUsername: boolean;
  user: PublicUser;
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

export type CreateAvatarUploadRequest = {
  contentType: string;
  byteSize: number;
  width?: number;
  height?: number;
};

export type CreateAvatarUploadResponse = {
  uploadId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  method: 'PUT';
  maxBytes: number;
  expiresAt: string;
};

export type CompleteAvatarResponse = {
  user: PublicUser;
};

export type PostDetail = FeedCard & {
  status: 'uploading' | 'processing' | 'published' | 'failed' | 'removed';
};
