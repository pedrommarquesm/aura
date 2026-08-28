import { NetworkError } from '@/lib/api/errors';

/**
 * PUT the picked file at the presigned URL.
 *
 * XHR rather than `fetch`: React Native's fetch does not report upload
 * progress, and a 40MB video with no bar looks stuck.
 */
export function putPresignedObject(
  url: string,
  headers: Record<string, string>,
  file: { uri: string; mimeType: string },
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new NetworkError(`Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new NetworkError('Upload failed'));
    xhr.onabort = () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    };

    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    xhr.send({ uri: file.uri, type: file.mimeType, name: 'media' } as unknown as Blob);
  });
}
