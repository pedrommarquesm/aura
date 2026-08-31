/** `#` + 1–64 letters, numbers, or underscore. Unicode letters so `#verão` indexes. */
export const HASHTAG_MAX_LENGTH = 64;

const TAG_BODY = `[\\p{L}\\p{N}_]{1,${HASHTAG_MAX_LENGTH}}`;
const EXTRACT_RE = new RegExp(`#(${TAG_BODY})`, 'gu');
const TAG_RE = new RegExp(`^${TAG_BODY}$`, 'u');

export function extractHashtags(caption: string | null | undefined): string[] {
  if (!caption) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const match of caption.matchAll(EXTRACT_RE)) {
    const tag = match[1]!.toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

/**
 * Strips a leading `#`, lowercases, and validates. Used for `/hashtags/:tag`
 * and the in-app search field.
 */
export function normalizeHashtagQuery(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let value = raw.trim();
  if (value.startsWith('#')) value = value.slice(1).trim();
  if (!value) return null;
  value = value.toLowerCase();
  return TAG_RE.test(value) ? value : null;
}
