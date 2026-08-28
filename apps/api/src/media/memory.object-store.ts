import type { ObjectMeta, ObjectStore, PresignedUpload, PutObjectInput } from './object-store';

interface StoredObject {
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

/** In-memory origin for tests. Same contract as R2, no network. */
export class MemoryObjectStore implements ObjectStore {
  readonly provider = 'local' as const;
  readonly configured = true;
  readonly bucket: string;
  readonly objects = new Map<string, StoredObject>();

  constructor(bucket = 'aura-media') {
    this.bucket = bucket;
  }

  ensureReady(): Promise<void> {
    return Promise.resolve();
  }

  presignUpload(
    key: string,
    opts: { contentType: string; expiresInSeconds: number; cacheControl?: string },
  ): Promise<PresignedUpload> {
    return Promise.resolve({
      url: `memory://${this.bucket}/${key}`,
      method: 'PUT',
      headers: { 'Content-Type': opts.contentType },
      expiresAt: new Date(Date.now() + opts.expiresInSeconds * 1000),
    });
  }

  head(key: string): Promise<ObjectMeta | null> {
    const stored = this.objects.get(key);
    if (!stored) return Promise.resolve(null);
    return Promise.resolve({
      key,
      contentLength: stored.body.length,
      contentType: stored.contentType,
    });
  }

  get(key: string): Promise<Buffer> {
    const stored = this.objects.get(key);
    if (!stored) return Promise.reject(new Error(`object not found: ${key}`));
    return Promise.resolve(stored.body);
  }

  put(key: string, body: Buffer, opts: PutObjectInput): Promise<void> {
    this.objects.set(key, { body, contentType: opts.contentType, cacheControl: opts.cacheControl });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  copy(fromKey: string, toKey: string, opts?: PutObjectInput): Promise<void> {
    const stored = this.objects.get(fromKey);
    if (!stored) return Promise.reject(new Error(`object not found: ${fromKey}`));
    this.objects.set(toKey, {
      body: stored.body,
      contentType: opts?.contentType ?? stored.contentType,
      cacheControl: opts?.cacheControl ?? stored.cacheControl,
    });
    return Promise.resolve();
  }
}
