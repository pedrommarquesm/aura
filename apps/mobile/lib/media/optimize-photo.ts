import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { measureFileBytes } from './measure-file';
import {
  UPLOAD_JPEG_QUALITY,
  mustReencodePhoto,
  normalizePhotoMime,
  shouldPreferOriginal,
  targetUploadSize,
} from './photo-targets';

export type OptimizePhotoInput = {
  uri: string;
  mimeType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
};

export type OptimizedPhoto = {
  uri: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  optimized: boolean;
};

/**
 * Shrink + JPEG-encode a picked photo before the presign/PUT.
 *
 * Runs off the picker interaction (see create.tsx). The parallel stages for
 * hashing, multi-asset, and video are in docs/client-media.md — this function
 * is the V1 encode stage only.
 */
export async function optimizePickedPhoto(input: OptimizePhotoInput): Promise<OptimizedPhoto> {
  const originalBytes = await measureFileBytes(input.uri, input.byteSize).catch(
    () => input.byteSize ?? 0,
  );
  const mime = normalizePhotoMime(input.mimeType);
  const target = targetUploadSize(input.width ?? 0, input.height ?? 0);
  const resized = target.scale < 1;

  let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;

  try {
    context = ImageManipulator.manipulate(input.uri);
    if (resized) {
      context.resize({ width: target.width });
    }

    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({
        compress: UPLOAD_JPEG_QUALITY,
        format: SaveFormat.JPEG,
      });
      const optimizedBytes = await measureFileBytes(saved.uri);

      if (
        shouldPreferOriginal({
          mimeType: mime,
          originalBytes,
          optimizedBytes,
          resized,
        })
      ) {
        return {
          uri: input.uri,
          mimeType: mime,
          byteSize: originalBytes,
          width: input.width,
          height: input.height,
          optimized: false,
        };
      }

      if (optimizedBytes <= 0) {
        throw new Error('unreadable');
      }

      return {
        uri: saved.uri,
        mimeType: 'image/jpeg',
        byteSize: optimizedBytes,
        width: saved.width,
        height: saved.height,
        optimized: true,
      };
    } finally {
      image.release();
    }
  } catch (cause) {
    if (originalBytes > 0 && !mustReencodePhoto(mime)) {
      return {
        uri: input.uri,
        mimeType: mime || 'image/jpeg',
        byteSize: originalBytes,
        width: input.width,
        height: input.height,
        optimized: false,
      };
    }
    throw cause;
  } finally {
    context?.release();
  }
}
