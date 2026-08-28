import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { and, count, eq, gt } from 'drizzle-orm';

import { ENV, type Env } from '../config/env';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { DB, type Database } from '../db/db.module';
import { mediaAssets, posts, type User } from '../db/schema';
import { MediaJob, type MediaProcessPayload } from '../queue/queue.constants';
import { MEDIA_QUEUE } from '../queue/queue.module';

import { extensionForContentType, masterKey } from './media-keys';
import {
  MASTER_CACHE_CONTROL,
  isAcceptedContentType,
  mediaTypeForContentType,
  type AcceptedContentType,
} from './media-types';
import { OBJECT_STORE, type ObjectStore } from './object-store';

export interface CreateUploadInput {
  contentType: string;
  byteSize: number;
  checksum?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface CreateUploadResult {
  postId: string;
  assetId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  method: 'PUT';
  maxBytes: number;
  expiresAt: string;
}

export interface CompleteUploadInput {
  caption?: string | null;
}

export interface CompleteUploadResult {
  postId: string;
  status: 'processing' | 'published';
}

@Injectable()
export class UploadsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(OBJECT_STORE) private readonly store: ObjectStore,
    @Inject(MEDIA_QUEUE) private readonly mediaQueue: Queue<MediaProcessPayload>,
  ) {}

  async create(actor: User, input: CreateUploadInput): Promise<CreateUploadResult> {
    if (!this.store.configured) {
      throw AppError.unavailable('Media storage is not configured');
    }

    this.assertAcceptable(input);
    await this.assertQuota(actor.id);

    const postId = newId();
    const assetId = newId();
    const extension = extensionForContentType(input.contentType);
    if (!extension) {
      throw new AppError(ErrorCode.UNSUPPORTED_MEDIA_TYPE, 'That file type is not supported', 415);
    }

    const key = masterKey(assetId, extension);
    const mediaType = mediaTypeForContentType(input.contentType);

    await this.store.ensureReady();

    const signed = await this.store.presignUpload(key, {
      contentType: input.contentType,
      contentLength: input.byteSize,
      cacheControl: MASTER_CACHE_CONTROL,
      expiresInSeconds: this.env.MEDIA_UPLOAD_TTL_SECONDS,
    });

    await this.db.transaction(async (tx) => {
      await tx.insert(posts).values({
        id: postId,
        authorId: actor.id,
        mediaType,
        status: 'uploading',
      });

      await tx.insert(mediaAssets).values({
        id: assetId,
        postId,
        storageProvider: this.store.provider,
        storageBucket: this.store.bucket,
        storageKey: key,
        contentType: input.contentType,
        byteSize: input.byteSize,
        checksum: input.checksum,
        width: input.width,
        height: input.height,
        durationMs: input.durationMs,
        processingStatus: 'pending',
      });
    });

    return {
      postId,
      assetId,
      uploadUrl: signed.url,
      uploadHeaders: signed.headers,
      method: 'PUT',
      maxBytes: input.byteSize,
      expiresAt: signed.expiresAt.toISOString(),
    };
  }

  async refresh(actor: User, postId: string): Promise<CreateUploadResult> {
    if (!this.store.configured) {
      throw AppError.unavailable('Media storage is not configured');
    }

    const post = await this.requireOwnPost(actor.id, postId);

    if (post.status !== 'uploading') {
      throw AppError.conflict(ErrorCode.CONFLICT, 'This upload can no longer be resumed');
    }

    const asset = await this.requireAsset(postId);

    const signed = await this.store.presignUpload(asset.storageKey, {
      contentType: asset.contentType,
      contentLength: asset.byteSize,
      cacheControl: MASTER_CACHE_CONTROL,
      expiresInSeconds: this.env.MEDIA_UPLOAD_TTL_SECONDS,
    });

    return {
      postId,
      assetId: asset.id,
      uploadUrl: signed.url,
      uploadHeaders: signed.headers,
      method: 'PUT',
      maxBytes: asset.byteSize,
      expiresAt: signed.expiresAt.toISOString(),
    };
  }

  async complete(actor: User, postId: string, input: CompleteUploadInput): Promise<CompleteUploadResult> {
    if (!this.store.configured) {
      throw AppError.unavailable('Media storage is not configured');
    }

    const post = await this.requireOwnPost(actor.id, postId);

    if (post.status === 'processing' || post.status === 'published') {
      return { postId, status: post.status === 'published' ? 'published' : 'processing' };
    }

    if (post.status !== 'uploading' && post.status !== 'failed') {
      throw AppError.conflict(ErrorCode.CONFLICT, 'This post cannot be completed');
    }

    const asset = await this.requireAsset(postId);
    const object = await this.store.head(asset.storageKey);

    if (!object) {
      throw new AppError(
        ErrorCode.UPLOAD_EXPIRED,
        'Nothing was uploaded for this post. Request a new upload URL.',
        409,
      );
    }

    if (object.contentLength > asset.byteSize) {
      throw new AppError(ErrorCode.UPLOAD_TOO_LARGE, 'Uploaded file is larger than declared', 413);
    }

    const caption = input.caption?.trim() ? input.caption.trim().slice(0, 2_200) : null;

    await this.db.update(posts).set({ status: 'processing', caption }).where(eq(posts.id, postId));
    await this.db
      .update(mediaAssets)
      .set({ byteSize: object.contentLength, updatedAt: new Date() })
      .where(eq(mediaAssets.id, asset.id));

    await this.mediaQueue.add(MediaJob.PROCESS, { postId, mediaAssetId: asset.id });

    return { postId, status: 'processing' };
  }

  private assertAcceptable(
    input: CreateUploadInput,
  ): asserts input is CreateUploadInput & { contentType: AcceptedContentType } {
    if (!isAcceptedContentType(input.contentType)) {
      throw new AppError(ErrorCode.UNSUPPORTED_MEDIA_TYPE, 'That file type is not supported', 415);
    }

    const isVideo = mediaTypeForContentType(input.contentType) === 'video';
    const maxBytes = isVideo ? this.env.MEDIA_VIDEO_MAX_BYTES : this.env.MEDIA_PHOTO_MAX_BYTES;

    if (input.byteSize <= 0 || input.byteSize > maxBytes) {
      throw new AppError(ErrorCode.UPLOAD_TOO_LARGE, 'That file is too big', 413);
    }

    if (isVideo) {
      if (input.durationMs == null) {
        throw AppError.badRequest('Video uploads must include durationMs');
      }
      if (input.durationMs > this.env.MEDIA_VIDEO_MAX_DURATION_MS) {
        throw AppError.badRequest('Video is longer than the allowed duration');
      }
    }
  }

  private async assertQuota(userId: string): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [row] = await this.db
      .select({ total: count() })
      .from(posts)
      .where(and(eq(posts.authorId, userId), gt(posts.createdAt, since)));

    if ((row?.total ?? 0) >= this.env.MEDIA_DAILY_UPLOAD_QUOTA) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Daily upload quota reached', 429);
    }
  }

  private async requireOwnPost(userId: string, postId: string) {
    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, postId),
    });

    if (!post) throw AppError.notFound('Post not found');
    if (post.authorId !== userId) throw AppError.forbidden();
    return post;
  }

  private async requireAsset(postId: string) {
    const asset = await this.db.query.mediaAssets.findFirst({
      where: (table, { eq: equals }) => equals(table.postId, postId),
    });

    if (!asset) throw AppError.notFound('Media asset not found');
    return asset;
  }
}
