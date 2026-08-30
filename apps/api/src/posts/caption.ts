/** Matches the complete-upload cap so an edit cannot grow past what create allows. */
export const CAPTION_MAX_LENGTH = 2_200;

export function normalizeCaption(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, CAPTION_MAX_LENGTH);
}
