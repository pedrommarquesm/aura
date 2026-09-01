import { authContinueHref, defaultSignedInPath, safeReturnPath } from "@/lib/auth/return-to";

/**
 * Web has no signed-in write action anymore — voting is a mobile gesture
 * (docs/redesign-tracker.md Q12). This only threads `next` / username claim
 * through sign-in; there is nothing to replay.
 */
export async function destinationAfterAuth({
  locale,
  needsUsername,
  next,
}: {
  locale: string;
  needsUsername: boolean;
  next: string | null;
}): Promise<string> {
  const returnTo = safeReturnPath(next) ?? defaultSignedInPath(locale);
  if (needsUsername) {
    return authContinueHref(locale, "username", returnTo);
  }
  return returnTo;
}
