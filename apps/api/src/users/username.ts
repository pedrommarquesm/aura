/** Strips a leading `@` so `/v1/users/@alice` and `/v1/users/alice` match. */
export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

/**
 * 3-30 letters, numbers, or underscore. The one rule for every place a
 * username is chosen: the app's claim screen, password registration, and
 * the waitlist join form (which now reserves a username up front).
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export function isValidUsernameFormat(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export const RESERVED_USERNAMES = new Set([
  'admin',
  'aura',
  'api',
  'support',
  'help',
  'about',
  'settings',
  'me',
  'you',
  'root',
  'system',
  'moderator',
]);

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value.toLowerCase());
}
