import { File } from 'expo-file-system';

/**
 * Byte length of a local picker URI.
 *
 * `expo-image-picker` often leaves `asset.fileSize` at 0 on iOS (especially
 * when the fast-path copies a HEIC and the JS asset is filled in before the
 * header read). The create screen used to treat that as unreadable and drop
 * the pick — which is why "choose a photo" looked unimplemented.
 */
export async function measureFileBytes(uri: string, reported?: number | null): Promise<number> {
  if (reported && reported > 0) return reported;

  try {
    const file = new File(uri);
    if (file.exists && file.size > 0) return file.size;
  } catch {
    // ph:// and some content:// URIs are not File-addressable.
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > 0) return blob.size;

  throw new Error('unreadable');
}
