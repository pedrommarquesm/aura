import { ApiError } from "@/lib/api/errors";
import type { AuthTokens, PublicUser, SignInResponse } from "@/lib/api/types";
import { upstream } from "@/lib/api/upstream";

import { readSessionCookies } from "./cookies";

export type Session = {
  user: PublicUser;
  accessToken: string;
  needsUsername: boolean;
};

export async function rotateRefreshToken(
  refreshToken: string,
): Promise<AuthTokens> {
  return upstream<AuthTokens>("/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

export async function signInWithGoogle(
  identityToken: string,
  nonce: string | undefined,
  locale: string | undefined,
): Promise<SignInResponse> {
  return upstream<SignInResponse>("/v1/auth/google", {
    method: "POST",
    body: {
      identityToken,
      nonce,
      locale,
      device: { platform: "web", appVersion: "0.1.0" },
    },
  });
}

export async function fetchMe(accessToken: string): Promise<PublicUser> {
  const { user } = await upstream<{ user: PublicUser }>("/v1/auth/me", {
    accessToken,
  });
  return user;
}

export async function claimUsername(
  accessToken: string,
  username: string,
): Promise<PublicUser> {
  const { user } = await upstream<{ user: PublicUser }>("/v1/auth/username", {
    method: "POST",
    accessToken,
    body: { username },
  });
  return user;
}

export async function revokeSession(accessToken: string): Promise<void> {
  try {
    await upstream<void>("/v1/auth/logout", {
      method: "POST",
      accessToken,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return;
    throw error;
  }
}

/**
 * Read the session for a Server Component. Does not rotate tokens — that
 * happens in the proxy so two parallel RSC reads cannot trip reuse detection.
 */
export async function getSession(): Promise<Session | null> {
  const { accessToken, needsUsername } = await readSessionCookies();
  if (!accessToken) return null;

  try {
    const user = await fetchMe(accessToken);
    return { user, accessToken, needsUsername };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}
