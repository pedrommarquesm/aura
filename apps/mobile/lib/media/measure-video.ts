import { File } from 'expo-file-system';

/**
 * Byte length of a picked video.
 *
 * Do not `fetch` a video into a Blob — a 60s clip can be tens of megabytes
 * and that path is how JS runs out of memory. Do not construct `File` for
 * `ph://` URIs either (MOB-53). After a Compatible / H.264 export the picker
 * gives us a `file://` copy in the app container.
 */
export async function measureVideoBytes(uri: string, reported?: number | null): Promise<number> {
  if (reported && reported > 0) return reported;

  if (!uri.startsWith('file:') && !uri.startsWith('/')) {
    throw new Error('unreadable');
  }

  try {
    const file = new File(uri);
    if (file.exists && typeof file.size === 'number' && file.size > 0) {
      return file.size;
    }
  } catch {
    throw new Error('unreadable');
  }

  throw new Error('unreadable');
}
