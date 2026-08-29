/**
 * Public share URLs and the matching app deep link (docs/i18n.md,
 * architecture §11, product spec §23).
 *
 * Web path is `/a/:username/post/:postId` — never locale-prefixed. A leading
 * `@` in the username segment is accepted and 308'd away (see proxy.ts).
 * Next.js App Router treats `@slot` as a parallel-route folder; putting
 * `@alice` in the URL makes the client router refetch RSC forever.
 *
 * The `@` stays in the UI and on the app deep link (`aura://a/@alice/…`).
 */

const APP_SCHEME = "aura";

/** Strips a leading `@` and decodes `%40`, so `@alice`, `alice` and `%40alice` match. */
export function normalizeHandle(raw: string): string {
  const decoded = safeDecode(raw).trim();
  return decoded.startsWith("@") ? decoded.slice(1) : decoded;
}

export function publicPostPath(username: string, postId: string): string {
  return `/a/${normalizeHandle(username)}/post/${postId}`;
}

/**
 * `/a/@alice/post/1` → `/a/alice/post/1`. Null when the path is already
 * canonical or is not a share URL.
 */
export function sharePathWithoutAtPrefix(pathname: string): string | null {
  if (!pathname.startsWith("/a/@")) return null;
  return `/a/${pathname.slice("/a/@".length)}`;
}

/** Custom-scheme deep link. Universal links wait on store listings (WEB-07). */
export function publicPostDeepLink(username: string, postId: string): string {
  return `${APP_SCHEME}://a/@${normalizeHandle(username)}/post/${postId}`;
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
