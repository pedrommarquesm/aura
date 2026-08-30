import { Inject, Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

import { DB, type Database } from '../db/db.module';
import { mediaAssets, posts, type MediaAsset, type MediaVariants } from '../db/schema';
import { eq } from 'drizzle-orm';

import { variantKey } from './media-keys';
import { MediaUrlResolver } from './media-url.resolver';
import { VARIANT_CACHE_CONTROL, isPhotoContentType } from './media-types';
import { MUX_PROVIDER, MuxVideoService } from './mux.service';
import { OBJECT_STORE, type ObjectStore } from './object-store';

export interface ProcessMediaResult {
  postId: string;
  status: 'published' | 'processing' | 'failed';
}

const FEED_MAX_WIDTH = 1080;
const THUMB_MAX_WIDTH = 400;
const JPEG_QUALITY = 85;

/**
 * Turns a just-uploaded master into feed renditions.
 *
 * Images are processed in-process with sharp and published immediately.
 * Video keeps the master in our bucket and asks Mux to ingest the public
 * CDN URL. The post stays `processing` until `video.asset.ready`.
 */
@Injectable()
export class ProcessMediaService {
  private readonly logger = new Logger(ProcessMediaService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(OBJECT_STORE) private readonly store: ObjectStore,
    private readonly mux: MuxVideoService,
    private readonly mediaUrls: MediaUrlResolver,
  ) {}

  async process(input: { postId: string; mediaAssetId: string }): Promise<ProcessMediaResult> {
    const asset = await this.db.query.mediaAssets.findFirst({
      where: (table, { eq: equals }) => equals(table.id, input.mediaAssetId),
    });

    if (!asset || asset.postId !== input.postId) {
      throw new Error(`media asset ${input.mediaAssetId} not found for post ${input.postId}`);
    }

    if (asset.processingStatus === 'ready') {
      return { postId: input.postId, status: 'published' };
    }

    // A retry after Mux already accepted the master must not create a second
    // asset. Publish still waits for the webhook.
    if (!isPhotoContentType(asset.contentType) && asset.externalAssetId) {
      return { postId: input.postId, status: 'processing' };
    }

    await this.db
      .update(mediaAssets)
      .set({ processingStatus: 'processing', processingError: null, updatedAt: new Date() })
      .where(eq(mediaAssets.id, asset.id));

    try {
      if (isPhotoContentType(asset.contentType)) {
        const result = await this.processPhoto(asset.id, asset.storageKey);
        await this.markReady(asset.id, result);
        await this.publishPost(input.postId);
        this.logger.log(`published post ${input.postId}`);
        return { postId: input.postId, status: 'published' };
      }

      await this.ingestVideo(asset);
      this.logger.log(`handed post ${input.postId} to Mux as ${asset.id}`);
      return { postId: input.postId, status: 'processing' };
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

  private async markReady(
    assetId: string,
    result: {
      variants: MediaVariants;
      width: number | null;
      height: number | null;
      byteSize: number;
    },
  ): Promise<void> {
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
      .where(eq(mediaAssets.id, assetId));
  }

  private async publishPost(postId: string): Promise<void> {
    await this.db
      .update(posts)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(posts.id, postId));
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

  private async ingestVideo(asset: MediaAsset): Promise<void> {
    if (!this.mux.ingestConfigured) {
      throw new Error('Mux is not configured');
    }

    const meta = await this.store.head(asset.storageKey);
    const sourceUrl = this.mediaUrls.url(
      { provider: asset.storageProvider, bucket: asset.storageBucket },
      asset.storageKey,
    );

    if (!sourceUrl) {
      throw new Error('Could not build a public URL for the video master');
    }

    const created = await this.mux.createAsset({
      sourceUrl,
      passthrough: asset.id,
    });

    await this.db
      .update(mediaAssets)
      .set({
        externalProvider: MUX_PROVIDER,
        externalAssetId: created.id,
        variants: created.playbackId ? { ...asset.variants, hls: created.playbackId } : asset.variants,
        byteSize: meta?.contentLength ?? asset.byteSize,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, asset.id));
  }
}
