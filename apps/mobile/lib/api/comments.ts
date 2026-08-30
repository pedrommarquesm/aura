import { api } from './client';
import type { CommentCard, CreateCommentResult, CursorPage } from './types';

/** Oldest-first thread. The server default is 20; this matches it. */
export const COMMENTS_PAGE_SIZE = 20;

export function fetchComments(
  postId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CursorPage<CommentCard>> {
  return api.get<CursorPage<CommentCard>>(`/posts/${postId}/comments`, {
    query: { cursor, limit: COMMENTS_PAGE_SIZE },
    signal,
  });
}

export function createComment(postId: string, body: string): Promise<CreateCommentResult> {
  return api.post<CreateCommentResult>(`/posts/${postId}/comments`, { body });
}
