import type { ImagePickerAsset } from 'expo-image-picker';

import { mockFeed } from '@/mocks/feed';
import type {
  CompleteAvatarResponse,
  CommentCard,
  CompleteUploadResponse,
  CreateAvatarUploadResponse,
  CreateCommentResult,
  CreateUploadResponse,
  CursorPage,
  FeedCard,
  LeaderboardPage,
  LikeResult,
  PostDetail,
  PublicProfile,
  PublicUser,
} from '@/lib/api';
import type { OptimizedVideo } from '@/lib/media/optimize-video';

import { fetchFeedPage } from '@/lib/api/feed';
import { createComment, fetchComments } from '@/lib/api/comments';
import { likePost, unlikePost } from '@/lib/api/likes';
import {
  completeUpload,
  createUpload,
  deletePost,
  fetchPost,
  refreshUpload,
  updatePostCaption,
} from '@/lib/api/posts';
import { fetchGlobalLeaderboard } from '@/lib/api/leaderboard';
import { claimUsername, fetchMe, logout, signInWithProvider } from '@/lib/api/auth';
import { completeAvatarUpload, createAvatarUpload, fetchPublicProfile, fetchUserPosts } from '@/lib/api/users';
import { cropAvatarPhoto } from '@/lib/media/crop-avatar';
import { pickPhotoFromLibrary } from '@/lib/media/pick-photo';
import { pickVideoFromLibrary } from '@/lib/media/pick-video';
import { optimizePickedPhoto } from '@/lib/media/optimize-photo';
import { optimizePickedVideo } from '@/lib/media/optimize-video';
import { putPresignedObject } from '@/lib/upload/put-presigned';

export const api = {
  fetchFeedPage: fetchFeedPage as jest.MockedFunction<typeof fetchFeedPage>,
  likePost: likePost as jest.MockedFunction<typeof likePost>,
  unlikePost: unlikePost as jest.MockedFunction<typeof unlikePost>,
  fetchComments: fetchComments as jest.MockedFunction<typeof fetchComments>,
  createComment: createComment as jest.MockedFunction<typeof createComment>,
  createUpload: createUpload as jest.MockedFunction<typeof createUpload>,
  refreshUpload: refreshUpload as jest.MockedFunction<typeof refreshUpload>,
  completeUpload: completeUpload as jest.MockedFunction<typeof completeUpload>,
  fetchPost: fetchPost as jest.MockedFunction<typeof fetchPost>,
  updatePostCaption: updatePostCaption as jest.MockedFunction<typeof updatePostCaption>,
  deletePost: deletePost as jest.MockedFunction<typeof deletePost>,
  fetchPublicProfile: fetchPublicProfile as jest.MockedFunction<typeof fetchPublicProfile>,
  fetchUserPosts: fetchUserPosts as jest.MockedFunction<typeof fetchUserPosts>,
  createAvatarUpload: createAvatarUpload as jest.MockedFunction<typeof createAvatarUpload>,
  completeAvatarUpload: completeAvatarUpload as jest.MockedFunction<typeof completeAvatarUpload>,
  cropAvatarPhoto: cropAvatarPhoto as jest.MockedFunction<typeof cropAvatarPhoto>,
  fetchGlobalLeaderboard: fetchGlobalLeaderboard as jest.MockedFunction<
    typeof fetchGlobalLeaderboard
  >,
  claimUsername: claimUsername as jest.MockedFunction<typeof claimUsername>,
  fetchMe: fetchMe as jest.MockedFunction<typeof fetchMe>,
  logout: logout as jest.MockedFunction<typeof logout>,
  signInWithProvider: signInWithProvider as jest.MockedFunction<typeof signInWithProvider>,
  pickPhotoFromLibrary: pickPhotoFromLibrary as jest.MockedFunction<typeof pickPhotoFromLibrary>,
  pickVideoFromLibrary: pickVideoFromLibrary as jest.MockedFunction<typeof pickVideoFromLibrary>,
  optimizePickedPhoto: optimizePickedPhoto as jest.MockedFunction<typeof optimizePickedPhoto>,
  optimizePickedVideo: optimizePickedVideo as jest.MockedFunction<typeof optimizePickedVideo>,
  putPresignedObject: putPresignedObject as jest.MockedFunction<typeof putPresignedObject>,
};

export const testUser: PublicUser = {
  id: 'u-tester',
  username: 'tester',
  displayName: 'Tester',
  avatarUrl: null,
  aura: 8_421,
  title: 'Aura Farmer',
  locale: 'en',
};

export const samplePhotoAsset = {
  uri: 'file:///picked.jpg',
  mimeType: 'image/jpeg',
  fileName: 'picked.jpg',
  fileSize: 400_000,
  width: 1080,
  height: 1350,
} as ImagePickerAsset;

export const sampleVideoAsset = {
  uri: 'file:///picked.mp4',
  mimeType: 'video/mp4',
  fileName: 'picked.mp4',
  fileSize: 8_000_000,
  width: 1080,
  height: 1920,
  duration: 12,
} as ImagePickerAsset;

export function feedPage(items: FeedCard[] = mockFeed): CursorPage<FeedCard> {
  return { items, nextCursor: null, hasMore: false };
}

export function commentsPage(items: CommentCard[] = []): CursorPage<CommentCard> {
  return { items, nextCursor: null, hasMore: false };
}

export function sampleComment(overrides: Partial<CommentCard> = {}): CommentCard {
  return {
    id: 'comment-1',
    body: 'this is fire',
    createdAt: '2026-08-30T12:00:00.000Z',
    author: {
      id: testUser.id,
      username: testUser.username,
      displayName: testUser.displayName,
      avatarUrl: testUser.avatarUrl,
      aura: testUser.aura,
      title: testUser.title,
    },
    ...overrides,
  };
}

export function createdComment(
  body = 'this is fire',
  commentCount = 1,
): CreateCommentResult {
  return { comment: sampleComment({ body }), commentCount };
}

export const likeResult = (liked = true): LikeResult => ({
  liked,
  likeCount: liked ? 1_285 : 1_283,
  postAura: liked ? 12_850 : 12_830,
  creatorAura: 82_431,
  actorAuraDelta: 0,
});

export const uploadResponse: CreateUploadResponse = {
  postId: 'post-new',
  assetId: 'asset-new',
  uploadUrl: 'https://upload.example/presign',
  uploadHeaders: { 'Content-Type': 'image/jpeg' },
  method: 'PUT',
  maxBytes: 20_000_000,
  expiresAt: '2099-01-01T00:00:00.000Z',
};

export const completeResponse: CompleteUploadResponse = {
  postId: 'post-new',
  status: 'published',
};

export const avatarUploadResponse: CreateAvatarUploadResponse = {
  uploadId: 'avatar-up-1',
  uploadUrl: 'https://upload.example/avatar',
  uploadHeaders: { 'Content-Type': 'image/jpeg' },
  method: 'PUT',
  maxBytes: 80_000,
  expiresAt: '2099-01-01T00:00:00.000Z',
};

export function avatarCompleteResponse(avatarUrl = 'https://cdn.aurarankd.com/avatars/u-tester/v.jpg'): CompleteAvatarResponse {
  return { user: { ...testUser, avatarUrl } };
}

export function publishedPost(overrides: Partial<PostDetail> = {}): PostDetail {
  return {
    ...mockFeed[0]!,
    id: 'post-new',
    status: 'published',
    caption: 'hello aura',
    ...overrides,
  };
}

/** Own profile / menu tests: author must be the signed-in tester. */
export function ownPost(overrides: Partial<PostDetail> = {}): PostDetail {
  const base = mockFeed[0]!;
  return {
    ...base,
    id: 'post-own',
    status: 'published',
    caption: 'my golden hour',
    author: {
      ...base.author,
      id: testUser.id,
      username: testUser.username,
      displayName: testUser.displayName,
      avatarUrl: testUser.avatarUrl,
      aura: testUser.aura,
      title: testUser.title,
    },
    ...overrides,
  };
}

export function profileFor(user: PublicUser): PublicProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    aura: user.aura,
    title: user.title,
    rank: 47,
    postCount: 3,
  };
}

export const leaderboardPage: LeaderboardPage = {
  entries: [
    {
      rank: 1,
      userId: 'u-alice',
      username: 'alice',
      displayName: null,
      avatarUrl: null,
      aura: 82_421,
      title: 'Aura Lord',
    },
    {
      rank: 2,
      userId: 'u-joao',
      username: 'joao',
      displayName: null,
      avatarUrl: null,
      aura: 79_301,
      title: 'Aura Lord',
    },
  ],
  viewer: {
    rank: 47,
    userId: testUser.id,
    username: testUser.username,
    displayName: testUser.displayName,
    avatarUrl: testUser.avatarUrl,
    aura: testUser.aura,
    title: testUser.title,
  },
  total: 120,
};

export function resetApiMocks() {
  for (const fn of Object.values(api)) {
    fn.mockReset();
  }

  api.fetchFeedPage.mockResolvedValue(feedPage());
  api.likePost.mockResolvedValue(likeResult(true));
  api.unlikePost.mockResolvedValue(likeResult(false));
  api.fetchComments.mockResolvedValue(commentsPage());
  api.createComment.mockResolvedValue(createdComment());
  api.createUpload.mockResolvedValue(uploadResponse);
  api.refreshUpload.mockResolvedValue(uploadResponse);
  api.completeUpload.mockResolvedValue(completeResponse);
  api.fetchPost.mockResolvedValue(publishedPost());
  api.updatePostCaption.mockImplementation(async (id, caption) => publishedPost({ id, caption }));
  api.deletePost.mockResolvedValue({ postId: 'post-new', status: 'removed' });
  api.fetchPublicProfile.mockResolvedValue(profileFor(testUser));
  api.fetchUserPosts.mockResolvedValue(feedPage(mockFeed.slice(0, 2)));
  api.createAvatarUpload.mockResolvedValue(avatarUploadResponse);
  api.completeAvatarUpload.mockResolvedValue(avatarCompleteResponse());
  api.cropAvatarPhoto.mockResolvedValue({
    uri: 'file:///avatar.jpg',
    mimeType: 'image/jpeg',
    byteSize: 80_000,
    width: 720,
    height: 720,
  });
  api.fetchGlobalLeaderboard.mockResolvedValue(leaderboardPage);
  api.logout.mockResolvedValue(undefined);
  api.claimUsername.mockImplementation(async (username) => ({
    user: { ...testUser, username },
  }));
  api.pickPhotoFromLibrary.mockResolvedValue(samplePhotoAsset);
  api.pickVideoFromLibrary.mockResolvedValue(sampleVideoAsset);
  api.optimizePickedPhoto.mockImplementation(async (input) => ({
    uri: input.uri,
    mimeType: input.mimeType || 'image/jpeg',
    byteSize: input.byteSize || 120_000,
    width: input.width,
    height: input.height,
    optimized: false,
  }));
  api.optimizePickedVideo.mockImplementation(async (input): Promise<OptimizedVideo> => ({
    uri: input.uri,
    mimeType: input.mimeType || 'video/mp4',
    byteSize: input.byteSize && input.byteSize > 0 ? input.byteSize : 4_000_000,
    width: input.width,
    height: input.height,
    durationMs: input.durationMs,
  }));
}
