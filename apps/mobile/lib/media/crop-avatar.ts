import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { AVATAR_JPEG_QUALITY, AVATAR_OUTPUT_SIZE, AVATAR_UPLOAD_MAX_BYTES } from './avatar-targets';
import { measureFileBytes } from './measure-file';

export type CropAvatarInput = {
  uri: string;
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type CroppedAvatar = {
  uri: string;
  mimeType: 'image/jpeg';
  byteSize: number;
  width: number;
  height: number;
};

/**
 * Crop the square that sat inside the circular mask, then resize to the
 * upload edge. Always JPEG — that is what `POST /v1/me/avatar/uploads` accepts.
 */
export async function cropAvatarPhoto(input: CropAvatarInput): Promise<CroppedAvatar> {
  let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;

  try {
    context = ImageManipulator.manipulate(input.uri);
    context.crop({
      originX: input.originX,
      originY: input.originY,
      width: input.width,
      height: input.height,
    });
    context.resize({ width: AVATAR_OUTPUT_SIZE, height: AVATAR_OUTPUT_SIZE });

    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({
        compress: AVATAR_JPEG_QUALITY,
        format: SaveFormat.JPEG,
      });
      const byteSize = await measureFileBytes(saved.uri);
      if (byteSize <= 0) throw new Error('unreadable');
      if (byteSize > AVATAR_UPLOAD_MAX_BYTES) throw new Error('too_large');

      return {
        uri: saved.uri,
        mimeType: 'image/jpeg',
        byteSize,
        width: saved.width,
        height: saved.height,
      };
    } finally {
      image.release();
    }
  } finally {
    context?.release();
  }
}
