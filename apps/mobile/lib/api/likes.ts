import { api } from './client';
import type { LikeResult } from './types';

export function likePost(postId: string): Promise<LikeResult> {
  return api.post<LikeResult>(`/posts/${postId}/like`);
}

export function unlikePost(postId: string): Promise<LikeResult> {
  return api.delete<LikeResult>(`/posts/${postId}/like`);
}
