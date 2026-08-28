import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

/**
 * Resolves the locale for every page request: an explicit prefix wins, then
 * the cookie set by the locale switcher, then `accept-language`.
 *
 * Named `proxy` rather than `middleware` — Next.js 16 renamed the file.
 */
export default createMiddleware(routing);

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
