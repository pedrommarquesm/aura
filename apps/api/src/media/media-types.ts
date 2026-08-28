export const PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const VIDEO_CONTENT_TYPES = ['video/mp4', 'video/quicktime'] as const;

export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];
export type VideoContentType = (typeof VIDEO_CONTENT_TYPES)[number];
export type AcceptedContentType = PhotoContentType | VideoContentType;

export function isPhotoContentType(value: string): value is PhotoContentType {
  return (PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
}

export function isVideoContentType(value: string): value is VideoContentType {
  return (VIDEO_CONTENT_TYPES as readonly string[]).includes(value);
}

export function isAcceptedContentType(value: string): value is AcceptedContentType {
  return isPhotoContentType(value) || isVideoContentType(value);
}

export function mediaTypeForContentType(contentType: AcceptedContentType): 'photo' | 'video' {
  return isVideoContentType(contentType) ? 'video' : 'photo';
}

/** Long TTL: variant keys are immutable (`v1` in the path is the cache buster). */
export const VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const MASTER_CACHE_CONTROL = 'public, max-age=31536000, immutable';
