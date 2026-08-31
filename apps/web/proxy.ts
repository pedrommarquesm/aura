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
import { isReferralPath } from "./lib/launch";
import { isSharePath, sharePathWithoutAtPrefix } from "./lib/share";

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
  // Host redirects (apex → www) live at DNS, not here. A 308 in this
  // proxy also 307s Flight requests and can loop with `?_rsc=`.

  // `@alice` in the path is a Next.js parallel-route slot. RSC requests to
  // `/a/@alice/post/…` 307 to the same URL with a new `?_rsc=` hash, and the
  // client retries forever (feed cards prefetch those links). Rewrite RSC so
  // we do not start that dance; 308 documents so old shares stay one hop.
  const withoutAt = sharePathWithoutAtPrefix(request.nextUrl.pathname);
  if (withoutAt) {
    const url = request.nextUrl.clone();
    url.pathname = withoutAt;
    // Next.js hides `?_rsc=` from `nextUrl`. Read the raw URL so a Flight
    // request is rewritten (not 308'd with the hash stripped — that replay
    // is the loop).
    const rsc = rscQueryValue(request);
    if (isRscRequest(request, rsc)) {
      if (rsc !== null) url.searchParams.set("_rsc", rsc);
      return NextResponse.rewrite(url);
    }
    return NextResponse.redirect(url, 308);
  }

  // Share URLs and short referral links stay unprefixed (docs/i18n.md).
  // next-intl would otherwise rewrite `/a/alice/post/…` or `/r/AB23CD45`
  // into `/en/…` or `/pt/…`. Session refresh still runs so `likedByMe`
  // works when the viewer is signed in.
  if (
    isSharePath(request.nextUrl.pathname) ||
    isReferralPath(request.nextUrl.pathname)
  ) {
    const response = NextResponse.next();
    await attachRefreshedSession(request, response);
    return response;
  }

  const response = intlMiddleware(request);
  await attachRefreshedSession(request, response);
  return response;
}

function rscQueryValue(request: NextRequest): string | null {
  try {
    return new URL(request.url).searchParams.get("_rsc");
  } catch {
    return request.nextUrl.searchParams.get("_rsc");
  }
}

function isRscRequest(request: NextRequest, rscQuery: string | null): boolean {
  return (
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") != null ||
    request.headers.get("next-url") != null ||
    rscQuery !== null
  );
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
