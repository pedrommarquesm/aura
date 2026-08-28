import { api } from './client';
import type { CompleteUploadResponse, CreateUploadRequest, CreateUploadResponse, PostDetail } from './types';

export function createUpload(input: CreateUploadRequest) {
  return api.post<CreateUploadResponse>('/posts/uploads', input);
}

export function refreshUpload(postId: string) {
  return api.post<CreateUploadResponse>(`/posts/${postId}/uploads`);
}

export function completeUpload(postId: string, caption?: string) {
  return api.post<CompleteUploadResponse>(`/posts/${postId}/complete`, { caption });
}

export function fetchPost(postId: string) {
  return api.get<PostDetail>(`/posts/${postId}`);
}
