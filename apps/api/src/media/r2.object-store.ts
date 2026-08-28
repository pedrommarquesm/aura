import { Logger } from '@nestjs/common';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { Env } from '../config/env';

import type { ObjectMeta, ObjectStore, PresignedUpload, PutObjectInput } from './object-store';

function r2Endpoint(env: Env): string {
  if (env.R2_ENDPOINT) return env.R2_ENDPOINT.replace(/\/+$/, '');
  if (env.R2_ACCOUNT_ID) {
    return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  throw new Error('R2_ENDPOINT or R2_ACCOUNT_ID is required');
}

export function isR2Configured(env: Env): boolean {
  return Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && (env.R2_ENDPOINT || env.R2_ACCOUNT_ID));
}

/**
 * Cloudflare R2 via the S3 API.
 *
 * Checksums are left `WHEN_REQUIRED`: recent AWS SDK versions default to
 * sending extra checksum headers that R2 rejects on some operations.
 */
export class R2ObjectStore implements ObjectStore {
  readonly provider = 'r2' as const;
  readonly configured = true;

  private readonly logger = new Logger(R2ObjectStore.name);
  private readonly client: S3Client;
  private ready: Promise<void> | null = null;

  constructor(private readonly env: Env) {
    const config: S3ClientConfig = {
      region: env.R2_REGION,
      endpoint: r2Endpoint(env),
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };

    this.client = new S3Client(config);
  }

  get bucket(): string {
    return this.env.R2_BUCKET;
  }

  async ensureReady(): Promise<void> {
    this.ready ??= this.createBucketIfMissing();
    await this.ready;
  }

  private async createBucketIfMissing(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`r2 bucket ${this.bucket} is reachable`);
      return;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status !== 404 && status !== 403) {
        this.logger.warn(`headBucket ${this.bucket} failed; uploads may still work (${String(error)})`);
        return;
      }
    }

    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`created r2 bucket ${this.bucket}`);
    } catch (error) {
      // 409 = already exists, which is what we wanted.
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 409) return;
      this.logger.error(`could not create r2 bucket ${this.bucket}: ${String(error)}`);
    }
  }

  async presignUpload(
    key: string,
    opts: { contentType: string; contentLength?: number; cacheControl?: string; expiresInSeconds: number },
  ): Promise<PresignedUpload> {
    await this.ensureReady();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: opts.contentType,
      CacheControl: opts.cacheControl,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: opts.expiresInSeconds });
    const headers: Record<string, string> = { 'Content-Type': opts.contentType };
    if (opts.cacheControl) headers['Cache-Control'] = opts.cacheControl;

    return {
      url,
      method: 'PUT',
      headers,
      expiresAt: new Date(Date.now() + opts.expiresInSeconds * 1000),
    };
  }

  async head(key: string): Promise<ObjectMeta | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        key,
        contentLength: result.ContentLength ?? 0,
        contentType: result.ContentType,
        etag: result.ETag,
      };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return null;
      throw error;
    }
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error(`empty object body for ${key}`);
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async put(key: string, body: Buffer, opts: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        CacheControl: opts.cacheControl,
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async copy(fromKey: string, toKey: string, opts?: PutObjectInput): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `/${this.bucket}/${fromKey}`,
        Key: toKey,
        ContentType: opts?.contentType,
        CacheControl: opts?.cacheControl,
        MetadataDirective: opts ? 'REPLACE' : 'COPY',
      }),
    );
  }
}
