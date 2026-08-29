/**
 * Same-origin path the browser may return to after sign-in.
 *
 * Rejects protocol-relative URLs and anything that is not a site path so a
 * crafted `?next=` cannot send the session to another host.
 */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("://") || value.includes("\\")) {
    return null;
  }
  if (value.length > 512) return null;

  return value;
}

export function defaultSignedInPath(locale: string) {
  return locale === "pt" ? "/pt/explorar" : "/feed";
}

export function loginPath(locale: string) {
  return locale === "pt" ? "/pt/entrar" : "/login";
}

export function usernamePath(locale: string) {
  return locale === "pt" ? "/pt/nome" : "/username";
}

export function authContinueHref(
  locale: string,
  kind: "login" | "username",
  next: string,
  like?: string | null,
) {
  const path = kind === "login" ? loginPath(locale) : usernamePath(locale);
  const params = new URLSearchParams();
  params.set("next", next);
  if (like) params.set("like", like);
  return `${path}?${params.toString()}`;
}
