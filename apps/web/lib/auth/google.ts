/**
 * Web Google OAuth client id. Public — it ships in the browser bundle.
 * Must be a *Web application* client (GIS will not accept the iOS one), and
 * the same value has to be in the API's `GOOGLE_CLIENT_IDS`.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";

export function isGoogleConfigured() {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}
