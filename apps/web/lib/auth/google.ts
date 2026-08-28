/**
 * Web Google OAuth client id. Public — it ships in the browser bundle.
 * Must be a *Web application* client (GIS will not accept the iOS one), and
 * the same value has to be in the API's `GOOGLE_CLIENT_IDS`.
 *
 * The client secret lives on Railway as `GOOGLE_CLIENT_SECRET` (web service).
 * GIS's ID-token button does not use it; do not put it in NEXT_PUBLIC_*.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  "37586478648-trc2amkrb29fv6h9undhkljfd7t69llh.apps.googleusercontent.com";

export function isGoogleConfigured() {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}
