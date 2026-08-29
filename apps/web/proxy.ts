import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import {
  accessTokenNeedsRefresh,
  clearSessionOnResponse,
  readSessionCookiesFromRequest,
  writeSessionOnResponse,
} from "./lib/auth/cookies";
import { rotateRefreshToken } from "./lib/auth/session";
import { isWwwHost } from "./lib/canonical-host";

/**
 * Resolves the locale for every page request: an explicit prefix wins, then
 * the cookie set by the locale switcher, then `accept-language`.
 *
 * Named `proxy` rather than `middleware` — Next.js 16 renamed the file.
 *
 * Token rotation lives here so a page of Server Components cannot fire two
 * refreshes and trip reuse detection on the API.
 */
const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (isWwwHost(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.hostname = "aurarankd.com";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Share URLs stay unprefixed (docs/i18n.md). next-intl would otherwise
  // rewrite `/a/@alice/post/…` to `/en/a/…` or `/pt/a/…`. Session refresh
  // still runs so `likedByMe` works when the viewer is signed in.
  if (isSharePath(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    await attachRefreshedSession(request, response);
    return response;
  }

  const response = intlMiddleware(request);
  await attachRefreshedSession(request, response);
  return response;
}

function isSharePath(pathname: string) {
  return pathname === "/a" || pathname.startsWith("/a/");
}

async function attachRefreshedSession(
  request: NextRequest,
  response: NextResponse,
) {
  const { accessToken, refreshToken, needsUsername } =
    readSessionCookiesFromRequest(request);

  if (!refreshToken || !accessTokenNeedsRefresh(accessToken)) return;

  try {
    const tokens = await rotateRefreshToken(refreshToken);
    writeSessionOnResponse(response, tokens, needsUsername || undefined);
  } catch {
    clearSessionOnResponse(response);
  }
}

export const config = {
  /**
   * Page requests only: everything except API routes, Next internals, files
   * with an extension (`/sitemap.xml`, `/robots.txt`, `/icon.svg`) and the
   * generated metadata images.
   *
   * The metadata images need naming because they have no extension, so the
   * extension rule misses them and localizing them 404s — `/apple-icon` would
   * be rewritten to `/en/apple-icon`, which is not a route. `opengraph-image`
   * is prefixed already (Next builds its URL from the real segment path, so
   * English's is `/en/opengraph-image/...`); stripping that prefix would also
   * drop the query, which is the cache-busting hash Next put there.
   */
  matcher:
    "/((?!api|_next|_vercel|(?:.*/)?(?:apple-icon|icon|opengraph-image|twitter-image)(?:/|$)|.*\\..*).*)",
};
