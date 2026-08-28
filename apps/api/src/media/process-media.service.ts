import { Inject, Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

import { DB, type Database } from '../db/db.module';
import { mediaAssets, posts, type MediaVariants } from '../db/schema';
import { eq } from 'drizzle-orm';

import { variantKey } from './media-keys';
import { VARIANT_CACHE_CONTROL, isPhotoContentType } from './media-types';
import { OBJECT_STORE, type ObjectStore } from './object-store';

export interface ProcessMediaResult {
  postId: string;
  status: 'published' | 'failed';
}

const FEED_MAX_WIDTH = 1080;
const THUMB_MAX_WIDTH = 400;
const JPEG_QUALITY = 85;

/**
 * Turns a just-uploaded master into feed renditions and publishes the post.
 *
 * Images are processed in-process with sharp. Video keeps the master as the
 * playable `feed` object until Cloudflare Stream lands (MEDIA-06) — V0 does
 * not run a transcoder farm.
 */
@Injectable()
export class ProcessMediaService {
  private readonly logger = new Logger(ProcessMediaService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(OBJECT_STORE) private readonly store: ObjectStore,
  ) {}

  async process(input: { postId: string; mediaAssetId: string }): Promise<ProcessMediaResult> {
    const asset = await this.db.query.mediaAssets.findFirst({
      where: (table, { eq: equals }) => equals(table.id, input.mediaAssetId),
    });

    if (!asset || asset.postId !== input.postId) {
      throw new Error(`media asset ${input.mediaAssetId} not found for post ${input.postId}`);
    }

    await this.db
      .update(mediaAssets)
      .set({ processingStatus: 'processing', processingError: null, updatedAt: new Date() })
      .where(eq(mediaAssets.id, asset.id));

    try {
      const result = isPhotoContentType(asset.contentType)
        ? await this.processPhoto(asset.id, asset.storageKey)
        : await this.processVideo(asset.storageKey);

      await this.db
        .update(mediaAssets)
        .set({
          processingStatus: 'ready',
          variants: result.variants,
          width: result.width,
          height: result.height,
          byteSize: result.byteSize,
          updatedAt: new Date(),
        })
        .where(eq(mediaAssets.id, asset.id));

      await this.db
        .update(posts)
        .set({ status: 'published', publishedAt: new Date() })
        .where(eq(posts.id, input.postId));

      this.logger.log(`published post ${input.postId}`);
      return { postId: input.postId, status: 'published' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'processing failed';
      this.logger.error(`processing post ${input.postId} failed: ${message}`);

      await this.db
        .update(mediaAssets)
        .set({ processingStatus: 'failed', processingError: message, updatedAt: new Date() })
        .where(eq(mediaAssets.id, asset.id));

      await this.db.update(posts).set({ status: 'failed' }).where(eq(posts.id, input.postId));

      return { postId: input.postId, status: 'failed' };
    }
  }

  private async processPhoto(assetId: string, masterKey: string) {
    const master = await this.store.get(masterKey);
    const image = sharp(master).rotate();
    const info = await image.metadata();

    const feedKey = variantKey(assetId, 'feed');
    const thumbKey = variantKey(assetId, 'thumb');

    const feed = await image
      .clone()
      .resize({ width: FEED_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    const thumb = await image
      .clone()
      .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    await this.store.put(feedKey, feed, { contentType: 'image/jpeg', cacheControl: VARIANT_CACHE_CONTROL });
    await this.store.put(thumbKey, thumb, { contentType: 'image/jpeg', cacheControl: VARIANT_CACHE_CONTROL });

    const feedMeta = await sharp(feed).metadata();

    return {
      variants: { feed: feedKey, thumb: thumbKey } satisfies MediaVariants,
      width: feedMeta.width ?? info.width ?? null,
      height: feedMeta.height ?? info.height ?? null,
      byteSize: master.length,
    };
  }

  private async processVideo(masterKeyPath: string) {
    // No Stream yet: the original file is the playable rendition. The feed
    // card already has a play overlay; HLS and posters arrive with MEDIA-06.
    const meta = await this.store.head(masterKeyPath);

    return {
      variants: { feed: masterKeyPath } satisfies MediaVariants,
      width: null as number | null,
      height: null as number | null,
      byteSize: meta?.contentLength ?? 0,
    };
  }
}
