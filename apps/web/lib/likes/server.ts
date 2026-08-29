import { ApiError } from "@/lib/api/errors";
import { upstream } from "@/lib/api/upstream";
import { isPostId } from "@/lib/likes/ids";

/**
 * Apply a pending like during a server redirect. Failures must not block
 * leaving login — the user already has a session.
 */
export async function applyPendingLike(
  accessToken: string,
  postId: string | null | undefined,
) {
  if (!isPostId(postId)) return;

  try {
    await upstream(`/v1/posts/${encodeURIComponent(postId)}/like`, {
      method: "POST",
      accessToken,
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === "already_liked" || error.code === "cannot_like_own_post")
    ) {
      return;
    }
  }
}
