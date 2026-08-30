/**
 * Provider-neutral object keys.
 *
 * No provider name, bucket, or region in the path: a bulk copy to another
 * origin preserves keys byte-for-byte, and migrating an asset is one column
 * change. See docs/backend-architecture.md §6.6.
 */

export type VariantName = 'feed' | 'thumb' | 'poster' | 'hls';

export function masterKey(assetId: string, extension: string): string {
  return `media/${assetId}/v1/master.${extension}`;
}

export function variantKey(assetId: string, variant: VariantName, extension = 'jpg'): string {
  return `media/${assetId}/v1/${variant}.${extension}`;
}

/** Square JPEG for a profile photo. Unique per upload so the CDN cache busts. */
export function avatarKey(userId: string, uploadId: string, extension: string): string {
  return `avatars/${userId}/${uploadId}.${extension}`;
}

export function extensionForContentType(contentType: string): string | null {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    case 'video/mp4':
      return 'mp4';
    case 'video/quicktime':
      return 'mov';
    default:
      return null;
  }
}
