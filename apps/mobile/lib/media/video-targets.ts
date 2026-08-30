/**
 * Client-side video targets. Numbers match the API defaults
 * (`MEDIA_VIDEO_MAX_BYTES`, `MEDIA_VIDEO_MAX_DURATION_MS`) so we refuse
 * before a presign instead of wasting a PUT.
 *
 * Mux transcodes the master. The picker returns the existing file
 * (passthrough) so the create screen can show immediately. We still refuse
 * locally at 60s / 100 MB.
 */

/** Matches `MEDIA_VIDEO_MAX_BYTES` on the API. */
export const VIDEO_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

/** Matches `MEDIA_VIDEO_MAX_DURATION_MS` on the API. */
export const VIDEO_MAX_DURATION_MS = 60_000;

/** Documented viewing bar. Mux makes the HLS; we no longer export 1080p in the picker. */
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
