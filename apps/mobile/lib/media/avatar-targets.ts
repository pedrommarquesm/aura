/**
 * Profile photo targets. The circle on screen is a mask; the file we PUT is
 * the square that sat inside it. Matches docs/client-media.md §8.
 */

/** Square edge of the JPEG we PUT. Sharp on a 3× 96pt avatar, small on radio. */
export const AVATAR_OUTPUT_SIZE = 720;

export const AVATAR_JPEG_QUALITY = 0.85;

/** Matches `MEDIA_AVATAR_MAX_BYTES` on the API. */
export const AVATAR_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_MIN_SCALE = 1;
export const AVATAR_MAX_SCALE = 4;
