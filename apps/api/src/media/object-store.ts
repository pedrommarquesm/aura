/**
 * Origin: where bytes live. R2 today, something else later.
 *
 * Independent of `MediaUrlResolver`, which is the *edge* (how bytes are
 * addressed publicly). Origin and edge are separate decisions — R2 origin
 * with a different CDN in front is a valid combination.
 *
 * See docs/backend-architecture.md §6.6.
 */
export const OBJECT_STORE = Symbol('OBJECT_STORE');

export interface ObjectMeta {
  key: string;
  contentLength: number;
  contentType?: string;
  etag?: string;
}

export interface PresignedUpload {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface PutObjectInput {
  contentType: string;
  cacheControl?: string;
}

export interface ObjectStore {
  readonly provider: 'r2' | 's3' | 'bunny' | 'local';
  readonly bucket: string;
  readonly configured: boolean;

  /** Create the bucket if the driver supports it and it is missing. */
  ensureReady(): Promise<void>;

  presignUpload(
    key: string,
    opts: { contentType: string; contentLength?: number; cacheControl?: string; expiresInSeconds: number },
  ): Promise<PresignedUpload>;

  head(key: string): Promise<ObjectMeta | null>;
  get(key: string): Promise<Buffer>;
  put(key: string, body: Buffer, opts: PutObjectInput): Promise<void>;
  delete(key: string): Promise<void>;
  copy(fromKey: string, toKey: string, opts?: PutObjectInput): Promise<void>;
}
