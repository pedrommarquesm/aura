import { ApiError } from "@/lib/api/errors";
import type { LikeResult } from "@/lib/api/types";

async function readError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    return new ApiError(
      response.status,
      body.error?.code ?? "unknown_error",
      body.error?.message ?? response.statusText,
    );
  } catch {
    return new ApiError(response.status, "unknown_error", response.statusText);
  }
}

async function sendLike(
  postId: string,
  method: "POST" | "DELETE",
): Promise<LikeResult> {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
    method,
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw await readError(response);
  }

  return (await response.json()) as LikeResult;
}

export function likePost(postId: string): Promise<LikeResult> {
  return sendLike(postId, "POST");
}

export function unlikePost(postId: string): Promise<LikeResult> {
  return sendLike(postId, "DELETE");
}

/**
 * Replay a like after sign-in. Idempotent likes and "already liked" are
 * success. Other failures must not block leaving the login screen.
 */
export async function replayPendingLike(postId: string): Promise<void> {
  try {
    await likePost(postId);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === "already_liked" || error.code === "cannot_like_own_post")
    ) {
      return;
    }
  }
}
