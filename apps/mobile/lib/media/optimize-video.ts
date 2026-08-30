import { Video, getRealPath } from 'react-native-compressor';

import { measureVideoBytes } from './measure-video';
import {
  VIDEO_EXPORT_MAX_LONGEST_EDGE,
  VIDEO_UPLOAD_MAX_BYTES,
  normalizeVideoMime,
} from './video-targets';

export type OptimizeVideoInput = {
  uri: string;
  mimeType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type OptimizedVideo = {
  uri: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

function targetSize(width: number, height: number) {
  const long = Math.max(width, height);
  if (!long || long <= VIDEO_EXPORT_MAX_LONGEST_EDGE) {
    return { width, height };
  }
  const scale = VIDEO_EXPORT_MAX_LONGEST_EDGE / long;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function readableUri(uri: string): Promise<string> {
  if (uri.startsWith('file:') || uri.startsWith('/')) return uri;
  try {
    return await getRealPath(uri, 'video');
  } catch {
    throw new Error('unreadable');
  }
}

/**
 * Native 1080p-class H.264 shrink after the picker returns. Same job as the
 * old `VideoExportPreset.H264_1920x1080`, but it runs on the create screen
 * so compose is not blocked. Not a JS / ffmpeg encode.
 */
export async function optimizePickedVideo(input: OptimizeVideoInput): Promise<OptimizedVideo> {
  const source = await readableUri(input.uri);
  const mime = normalizeVideoMime(input.mimeType, source) || 'video/mp4';

  let originalBytes = input.byteSize && input.byteSize > 0 ? input.byteSize : 0;
  try {
    originalBytes = await measureVideoBytes(source, originalBytes || undefined);
  } catch {
    originalBytes = originalBytes || 0;
  }

  const longEdge = Math.max(input.width ?? 0, input.height ?? 0);
  const alreadyFits =
    originalBytes > 0 &&
    originalBytes <= VIDEO_UPLOAD_MAX_BYTES &&
    (longEdge === 0 || longEdge <= VIDEO_EXPORT_MAX_LONGEST_EDGE);

  if (alreadyFits) {
    return {
      uri: source,
      mimeType: mime,
      byteSize: originalBytes,
      width: input.width,
      height: input.height,
      durationMs: input.durationMs,
    };
  }

  let compressedUri: string;
  try {
    compressedUri = await Video.compress(source, {
      compressionMethod: 'manual',
      maxSize: VIDEO_EXPORT_MAX_LONGEST_EDGE,
      minimumFileSizeForCompress: 0,
    });
  } catch (cause) {
    if (originalBytes > 0 && originalBytes <= VIDEO_UPLOAD_MAX_BYTES) {
      return {
        uri: source,
        mimeType: mime,
        byteSize: originalBytes,
        width: input.width,
        height: input.height,
        durationMs: input.durationMs,
      };
    }
    throw cause instanceof Error && cause.message === 'unreadable'
      ? cause
      : new Error('optimize');
  }

  let compressedBytes = 0;
  try {
    compressedBytes = await measureVideoBytes(compressedUri);
  } catch {
    compressedBytes = 0;
  }

  if (compressedBytes > 0 && compressedBytes <= VIDEO_UPLOAD_MAX_BYTES) {
    const sized = targetSize(input.width ?? 0, input.height ?? 0);
    return {
      uri: compressedUri,
      mimeType: 'video/mp4',
      byteSize: compressedBytes,
      width: sized.width || input.width,
      height: sized.height || input.height,
      durationMs: input.durationMs,
    };
  }

  if (originalBytes > 0 && originalBytes <= VIDEO_UPLOAD_MAX_BYTES) {
    return {
      uri: source,
      mimeType: mime,
      byteSize: originalBytes,
      width: input.width,
      height: input.height,
      durationMs: input.durationMs,
    };
  }

  throw new Error('too_large');
}
