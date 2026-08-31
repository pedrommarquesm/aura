/** Same grammar as the API. FND-03 is not ready, so the clients keep a copy. */
export const HASHTAG_MAX_LENGTH = 64;

const TAG_BODY = `[\\p{L}\\p{N}_]{1,${HASHTAG_MAX_LENGTH}}`;
const EXTRACT_RE = new RegExp(`#(${TAG_BODY})`, 'gu');
const TAG_RE = new RegExp(`^${TAG_BODY}$`, 'u');

export type CaptionSegment = {
  text: string;
  /** Lowercase tag when this span is a hashtag. Display uses `text` as authored. */
  tag: string | null;
};

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

export function normalizeHashtagQuery(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let value = raw.trim();
  if (value.startsWith('#')) value = value.slice(1).trim();
  if (!value) return null;
  value = value.toLowerCase();
  return TAG_RE.test(value) ? value : null;
}

export function parseCaptionSegments(caption: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let last = 0;

  for (const match of caption.matchAll(EXTRACT_RE)) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({ text: caption.slice(last, start), tag: null });
    }
    segments.push({ text: match[0], tag: match[1]!.toLowerCase() });
    last = start + match[0].length;
  }

  if (last < caption.length) {
    segments.push({ text: caption.slice(last), tag: null });
  }

  return segments;
}

export function hashtagPath(tag: string): `/hashtag/${string}` {
  return `/hashtag/${encodeURIComponent(tag)}`;
}

export function displayHashtag(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}
