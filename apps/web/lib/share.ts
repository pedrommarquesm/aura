/**
 * Public share URLs and the matching app deep link (docs/i18n.md,
 * architecture §11, product spec §23).
 *
 * `/a/@username/post/:postId` is canonical and never locale-prefixed. Instagram,
 * WhatsApp and TikTok all get the same link; the page renders in the viewer's
 * locale.
 */

const APP_SCHEME = "aura";

/** Strips a leading `@` and decodes `%40`, so `@alice`, `alice` and `%40alice` match. */
export function normalizeHandle(raw: string): string {
  const decoded = safeDecode(raw).trim();
  return decoded.startsWith("@") ? decoded.slice(1) : decoded;
}

export function publicPostPath(username: string, postId: string): string {
  return `/a/@${normalizeHandle(username)}/post/${postId}`;
}

/** Custom-scheme deep link. Universal links wait on store listings (WEB-07). */
export function publicPostDeepLink(username: string, postId: string): string {
  return `${APP_SCHEME}://${publicPostPath(username, postId).replace(/^\//, "")}`;
}

export function isSharePath(pathname: string) {
  return pathname === "/a" || pathname.startsWith("/a/");
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
