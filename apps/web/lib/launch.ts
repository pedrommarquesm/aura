/**
 * Pre-launch gate for the public site.
 *
 * Web sign-in stays off until we flip `NEXT_PUBLIC_WEB_AUTH_ENABLED`. The
 * Google GIS client and the login form must not load on a reachable page
 * while this is false — that is the whole point of the waitlist.
 */
export const webAuthEnabled =
  process.env.NEXT_PUBLIC_WEB_AUTH_ENABLED === "true";

export const JOIN_AURA = 10;
export const REFERRAL_AURA = 10;

export const REF_QUERY = "ref";
export const REF_STORAGE_KEY = "aura.waitlist.ref";

export function readReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(code) ? code : null;
}

/** Short share URLs (`/r/AB23CD45`). Unprefixed, same rule as `/a/…`. */
export function isReferralPath(pathname: string) {
  return pathname === "/r" || pathname.startsWith("/r/");
}
