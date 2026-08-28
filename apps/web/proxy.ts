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
  // Everything except API routes, Next internals and files with an extension
  // (`/sitemap.xml`, `/robots.txt`, `/icon.svg`), which must not be localized.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
