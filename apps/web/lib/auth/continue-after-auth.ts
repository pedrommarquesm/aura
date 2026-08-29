import {
  authContinueHref,
  defaultSignedInPath,
  safeReturnPath,
} from "@/lib/auth/return-to";
import { isPostId } from "@/lib/likes/ids";
import { replayPendingLike } from "@/lib/likes/client";

export async function destinationAfterAuth({
  locale,
  needsUsername,
  next,
  like,
}: {
  locale: string;
  needsUsername: boolean;
  next: string | null;
  like: string | null;
}): Promise<string> {
  if (isPostId(like)) {
    await replayPendingLike(like);
  }

  const returnTo = safeReturnPath(next) ?? defaultSignedInPath(locale);
  if (needsUsername) {
    return authContinueHref(locale, "username", returnTo);
  }
  return returnTo;
}
