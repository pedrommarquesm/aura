export { api, type RequestOptions, type SessionBridge } from './client';
export { API_BASE_URL, IS_API_CONFIGURED } from './config';
export { messageForError, messageForErrorCode } from './error-message';
export { ApiError, NetworkError, SessionExpiredError, isRetryable } from './errors';
export { claimUsername, fetchMe, logout, signInWithProvider, type AuthProvider } from './auth';
export { FEED_PAGE_SIZE, fetchFeedPage, type FeedRanking } from './feed';
export { LEADERBOARD_PAGE_SIZE, fetchGlobalLeaderboard } from './leaderboard';
export { likePost, unlikePost } from './likes';
export { completeUpload, createUpload, fetchPost, refreshUpload } from './posts';
export { USER_POSTS_PAGE_SIZE, fetchPublicProfile, fetchUserPosts } from './users';
export type {
  AuthTokens,
  CompleteUploadResponse,
  CreateUploadRequest,
  CreateUploadResponse,
  CursorPage,
  FeedAuthor,
  FeedCard,
  FeedMedia,
  LeaderboardEntry,
  LeaderboardPage,
  LikeResult,
  MediaType,
  PostDetail,
  PublicProfile,
  PublicUser,
  SignInResponse,
} from './types';
