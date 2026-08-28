/** Strips a leading `@` so `/v1/users/@alice` and `/v1/users/alice` match. */
export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}
