/**
 * Domain mocks must live in `setupFiles` so they are installed before a test
 * file imports a screen (which would otherwise bind the real API modules).
 */
jest.mock('@/lib/api/feed', () => ({
  fetchFeedPage: jest.fn(),
  FEED_PAGE_SIZE: 10,
}));

jest.mock('@/lib/api/likes', () => ({
  likePost: jest.fn(),
  unlikePost: jest.fn(),
}));

jest.mock('@/lib/api/comments', () => ({
  fetchComments: jest.fn(),
  createComment: jest.fn(),
  COMMENTS_PAGE_SIZE: 20,
}));

jest.mock('@/lib/api/posts', () => ({
  createUpload: jest.fn(),
  refreshUpload: jest.fn(),
  completeUpload: jest.fn(),
  fetchPost: jest.fn(),
  updatePostCaption: jest.fn(),
  deletePost: jest.fn(),
}));

jest.mock('@/lib/api/users', () => ({
  fetchPublicProfile: jest.fn(),
  fetchUserPosts: jest.fn(),
  createAvatarUpload: jest.fn(),
  completeAvatarUpload: jest.fn(),
  USER_POSTS_PAGE_SIZE: 12,
}));

jest.mock('@/lib/api/leaderboard', () => ({
  fetchGlobalLeaderboard: jest.fn(),
  LEADERBOARD_PAGE_SIZE: 100,
}));

jest.mock('@/lib/api/auth', () => ({
  signInWithProvider: jest.fn(),
  fetchMe: jest.fn(),
  claimUsername: jest.fn(),
  logout: jest.fn(async () => undefined),
}));

jest.mock('@/lib/media/pick-photo', () => ({
  pickPhotoFromLibrary: jest.fn(),
  LibraryPermissionError: class LibraryPermissionError extends Error {
    constructor() {
      super('library_permission');
      this.name = 'LibraryPermissionError';
    }
  },
}));

jest.mock('@/lib/media/pick-video', () => ({
  pickVideoFromLibrary: jest.fn(),
}));

jest.mock('@/lib/media/optimize-photo', () => ({
  optimizePickedPhoto: jest.fn(),
}));

jest.mock('@/lib/media/crop-avatar', () => ({
  cropAvatarPhoto: jest.fn(),
}));

jest.mock('@/lib/media/optimize-video', () => ({
  optimizePickedVideo: jest.fn(),
}));

jest.mock('@/lib/media/measure-file', () => ({
  measureFileBytes: jest.fn(async () => 120_000),
}));

jest.mock('@/lib/upload/put-presigned', () => ({
  putPresignedObject: jest.fn(async () => undefined),
}));
