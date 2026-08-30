/**
 * Client-side video targets. Numbers match the API defaults
 * (`MEDIA_VIDEO_MAX_BYTES`, `MEDIA_VIDEO_MAX_DURATION_MS`) so we refuse
 * before a presign instead of wasting a PUT.
 *
 * Mux transcodes the master. The phone only shrinks so the upload is a
 * 1080p-class H.264 file, not a 4K camera-roll original.
 */

/** Matches `MEDIA_VIDEO_MAX_BYTES` on the API. */
export const VIDEO_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

/** Matches `MEDIA_VIDEO_MAX_DURATION_MS` on the API. */
export const VIDEO_MAX_DURATION_MS = 60_000;

/** Longest edge we ask the native exporter for. Mux still makes the HLS. */
export const VIDEO_EXPORT_MAX_LONGEST_EDGE = 1080;

const ACCEPTED = new Set(['video/mp4', 'video/quicktime']);

export function normalizeVideoMime(mimeType: string | undefined, uri?: string): string {
  const raw = (mimeType ?? '').trim().toLowerCase();
  if (raw === 'video/mov' || raw === 'video/qt') return 'video/quicktime';
  if (raw === 'video/mpeg4' || raw === 'video/x-m4v') return 'video/mp4';
  if (ACCEPTED.has(raw)) return raw;

  const path = (uri ?? '').split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.mov')) return 'video/quicktime';
  if (path.endsWith('.mp4') || path.endsWith('.m4v')) return 'video/mp4';

  return raw;
}

export function isAcceptedVideoMime(mimeType: string): boolean {
  return ACCEPTED.has(mimeType);
}

/**
 * Expo ImagePicker documents `duration` in seconds. A value already over 180
 * is treated as milliseconds (a 3-minute clip is already over our 60s cap).
 */
export function durationMsFromPicker(duration: number | null | undefined): number | null {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return null;
  if (duration > 180) return Math.round(duration);
  return Math.round(duration * 1000);
}

export function isVideoTooLong(durationMs: number | null): boolean {
  return durationMs == null || durationMs > VIDEO_MAX_DURATION_MS;
}

export function isVideoTooLarge(byteSize: number): boolean {
  return byteSize <= 0 || byteSize > VIDEO_UPLOAD_MAX_BYTES;
}
