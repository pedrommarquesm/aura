import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import type { AuthTokens } from "@/lib/api/types";

export const SESSION_COOKIES = {
  access: "aura_at",
  refresh: "aura_rt",
  onboarding: "aura_nu",
} as const;

const REFRESH_MAX_AGE = 60 * 24 * 60 * 60;

function cookieBase(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

type CookieSetter = {
  set: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
      path?: string;
      maxAge?: number;
    },
  ) => void;
};

export function writeSessionCookies(
  store: CookieSetter,
  tokens: AuthTokens,
  needsUsername?: boolean,
) {
  store.set(
    SESSION_COOKIES.access,
    tokens.accessToken,
    cookieBase(tokens.expiresIn),
  );
  store.set(
    SESSION_COOKIES.refresh,
    tokens.refreshToken,
    cookieBase(REFRESH_MAX_AGE),
  );

  if (needsUsername === true) {
    store.set(SESSION_COOKIES.onboarding, "1", cookieBase(REFRESH_MAX_AGE));
  } else if (needsUsername === false) {
    store.set(SESSION_COOKIES.onboarding, "", cookieBase(0));
  }
}

export function clearOnboardingCookie(store: CookieSetter) {
  store.set(SESSION_COOKIES.onboarding, "", cookieBase(0));
}

export function clearSessionCookies(store: CookieSetter) {
  store.set(SESSION_COOKIES.access, "", cookieBase(0));
  store.set(SESSION_COOKIES.refresh, "", cookieBase(0));
  store.set(SESSION_COOKIES.onboarding, "", cookieBase(0));
}

export function writeSessionOnResponse(
  response: NextResponse,
  tokens: AuthTokens,
  needsUsername?: boolean,
) {
  writeSessionCookies(response.cookies, tokens, needsUsername);
}

export function clearSessionOnResponse(response: NextResponse) {
  clearSessionCookies(response.cookies);
}

export async function readSessionCookies() {
  const jar = await cookies();
  return {
    accessToken: jar.get(SESSION_COOKIES.access)?.value ?? null,
    refreshToken: jar.get(SESSION_COOKIES.refresh)?.value ?? null,
    needsUsername: jar.get(SESSION_COOKIES.onboarding)?.value === "1",
  };
}

export function readSessionCookiesFromRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
}) {
  return {
    accessToken: request.cookies.get(SESSION_COOKIES.access)?.value ?? null,
    refreshToken: request.cookies.get(SESSION_COOKIES.refresh)?.value ?? null,
    needsUsername:
      request.cookies.get(SESSION_COOKIES.onboarding)?.value === "1",
  };
}

/** Parse `exp` without verifying — the API is the authority. */
export function accessTokenExpiresAt(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const payload = JSON.parse(
      atob(segment.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function accessTokenNeedsRefresh(token: string | null): boolean {
  if (!token) return true;
  const expiresAt = accessTokenExpiresAt(token);
  if (expiresAt === null) return true;
  return expiresAt - Date.now() < 60_000;
}
