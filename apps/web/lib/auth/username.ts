/**
 * Mirrors the API's claim rules (`AuthService.claimUsername`) so the form can
 * refuse a bad handle before the round trip. The server is still the authority.
 */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "aura",
  "api",
  "support",
  "help",
  "about",
  "settings",
  "me",
  "you",
  "root",
  "system",
  "moderator",
]);

export type UsernameProblem = "invalid" | "reserved";

export function normalizeUsername(value: string): string {
  return value.trim();
}

export function usernameProblem(value: string): UsernameProblem | null {
  const username = normalizeUsername(value);

  if (!USERNAME_PATTERN.test(username)) return "invalid";
  if (RESERVED_USERNAMES.has(username.toLowerCase())) return "reserved";

  return null;
}
