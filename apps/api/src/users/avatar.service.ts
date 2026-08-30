import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { ENV, type Env } from '../config/env';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { DB, type Database } from '../db/db.module';
import { users, type User } from '../db/schema';
import { avatarKey, extensionForContentType } from '../media/media-keys';
import { MASTER_CACHE_CONTROL } from '../media/media-types';
import { MediaUrlResolver } from '../media/media-url.resolver';
import { OBJECT_STORE, type ObjectStore } from '../media/object-store';

import { toPublicUser, type PublicUser } from './public-user';

export interface CreateAvatarUploadInput {
  contentType: string;
  byteSize: number;
  width?: number;
  height?: number;
}

export interface CreateAvatarUploadResult {
  uploadId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  method: 'PUT';
  maxBytes: number;
  expiresAt: string;
}

export interface CompleteAvatarUploadInput {
  uploadId: string;
}

@Injectable()
export class AvatarService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(OBJECT_STORE) private readonly store: ObjectStore,
    private readonly resolver: MediaUrlResolver,
  ) {}

  async create(actor: User, input: CreateAvatarUploadInput): Promise<CreateAvatarUploadResult> {
    if (!this.store.configured) {
      throw AppError.unavailable('Media storage is not configured');
    }

    this.assertAcceptable(input);

    const uploadId = newId();
    const extension = extensionForContentType(input.contentType);
    if (!extension) {
      throw new AppError(ErrorCode.UNSUPPORTED_MEDIA_TYPE, 'That file type is not supported', 415);
    }

    const key = avatarKey(actor.id, uploadId, extension);
    await this.store.ensureReady();

    const signed = await this.store.presignUpload(key, {
      contentType: input.contentType,
      contentLength: input.byteSize,
      cacheControl: MASTER_CACHE_CONTROL,
      expiresInSeconds: this.env.MEDIA_UPLOAD_TTL_SECONDS,
    });

    return {
      uploadId,
      uploadUrl: signed.url,
      uploadHeaders: signed.headers,
      method: 'PUT',
      maxBytes: input.byteSize,
      expiresAt: signed.expiresAt.toISOString(),
    };
  }

  async complete(actor: User, input: CompleteAvatarUploadInput): Promise<{ user: PublicUser }> {
    if (!this.store.configured) {
      throw AppError.unavailable('Media storage is not configured');
    }

    const uploadId = input.uploadId.trim();
    if (!uploadId) {
      throw AppError.badRequest('uploadId is required');
    }

    const key = avatarKey(actor.id, uploadId, 'jpg');
    const object = await this.store.head(key);

    if (!object) {
      throw new AppError(
        ErrorCode.UPLOAD_EXPIRED,
        'Nothing was uploaded for this avatar. Request a new upload URL.',
        409,
      );
    }

    if (object.contentLength > this.env.MEDIA_AVATAR_MAX_BYTES) {
      throw new AppError(ErrorCode.UPLOAD_TOO_LARGE, 'Uploaded file is larger than allowed', 413);
    }

    const avatarUrl = this.resolver.url(
      { provider: this.store.provider, bucket: this.store.bucket },
      key,
    );

    const [updated] = await this.db
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, actor.id))
      .returning();

    if (!updated) {
      throw AppError.notFound('Account no longer exists');
    }

    return { user: toPublicUser(updated) };
  }

  private assertAcceptable(input: CreateAvatarUploadInput): void {
    // The app always crops to a square JPEG. Reject everything else so complete
    // can reconstruct `avatars/{userId}/{uploadId}.jpg` without a pending row.
    if (input.contentType !== 'image/jpeg') {
      throw new AppError(ErrorCode.UNSUPPORTED_MEDIA_TYPE, 'That file type is not supported', 415);
    }

    if (input.byteSize <= 0 || input.byteSize > this.env.MEDIA_AVATAR_MAX_BYTES) {
      throw new AppError(ErrorCode.UPLOAD_TOO_LARGE, 'That file is too big', 413);
    }
  }
}
