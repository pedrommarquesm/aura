/**
 * Client-side photo targets. Numbers and rules live here so the create screen,
 * the optimizer, and docs/client-media.md cannot drift.
 *
 * Viewing bar: a 3× 430pt phone (largest iPhone we ship for; tablets are off)
 * is ~1290 CSS pixels on the long edge. 2160 is ~1.67× that, so a pinch-zoom
 * or a later crop still looks sharp, and the worker still has headroom to
 * make the 1080 feed / 400 thumb JPEGs.
 *
 * The API default photo cap is 20MB (`MEDIA_PHOTO_MAX_BYTES`). We refuse
 * locally at the same number so a huge PNG does not eat a presign + PUT
 * just to be rejected.
 */

/** Longest edge of the file we PUT. Worker then makes 1080 / 400. */
export const UPLOAD_MAX_LONGEST_EDGE = 2160;

/** JPEG quality for the client encode. Worker variants use 85; 0.82 is the upload master. */
export const UPLOAD_JPEG_QUALITY = 0.82;

/** Matches `MEDIA_PHOTO_MAX_BYTES` on the API. */
export const PHOTO_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

const KEEPABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALWAYS_REENCODE = new Set(['image/heic', 'image/heif']);

export function normalizePhotoMime(mimeType: string | undefined): string {
  const raw = (mimeType ?? '').trim().toLowerCase();
  if (raw === 'image/jpg') return 'image/jpeg';
  return raw;
}

export function mustReencodePhoto(mimeType: string | undefined): boolean {
  const mime = normalizePhotoMime(mimeType);
  return mime === '' || ALWAYS_REENCODE.has(mime) || !KEEPABLE_TYPES.has(mime);
}

export function targetUploadSize(
  width: number,
  height: number,
  maxLongestEdge = UPLOAD_MAX_LONGEST_EDGE,
): { width: number; height: number; scale: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxLongestEdge, height: maxLongestEdge, scale: 1 };
  }

  const longest = Math.max(width, height);
  if (longest <= maxLongestEdge) {
    return { width, height, scale: 1 };
  }

  const scale = maxLongestEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

export function shouldPreferOriginal(input: {
  mimeType: string | undefined;
  originalBytes: number;
  optimizedBytes: number;
  resized: boolean;
}): boolean {
  if (input.resized) return false;
  if (mustReencodePhoto(input.mimeType)) return false;
  return input.originalBytes > 0 && input.originalBytes <= input.optimizedBytes;
}
