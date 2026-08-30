import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB, type Database } from '../db/db.module';
import { mediaAssets, posts, type MediaVariants } from '../db/schema';

import { MUX_PROVIDER } from './mux.service';

export interface MuxWebhookResult {
  ok: true;
  ignored?: boolean;
  already?: boolean;
  status?: 'published' | 'failed';
}

interface MuxWebhookEvent {
  type?: string;
  data?: {
    id?: string;
    passthrough?: string | null;
    duration?: number;
    playback_ids?: Array<{ id?: string; policy?: string }>;
    tracks?: Array<{ type?: string; max_width?: number; max_height?: number }>;
    errors?: { type?: string; messages?: string[] };
  };
}

/**
 * Applies Mux asset lifecycle events. The worker only creates the asset and
 * stores its id; publish waits for `video.asset.ready` so the feed never
 * serves a playback URL that 404s.
 */
@Injectable()
export class MuxWebhookService {
  private readonly logger = new Logger(MuxWebhookService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async handle(event: MuxWebhookEvent): Promise<MuxWebhookResult> {
    const type = event.type ?? '';
    if (type !== 'video.asset.ready' && type !== 'video.asset.errored') {
      return { ok: true, ignored: true };
    }

    const asset = await this.findAsset(event.data);
    if (!asset) {
      this.logger.warn(`Mux ${type} for unknown asset ${event.data?.id ?? 'none'}`);
      return { ok: true, ignored: true };
    }

    if (type === 'video.asset.errored') {
      return this.fail(asset, event);
    }

    return this.publish(asset, event);
  }

  private async findAsset(data: MuxWebhookEvent['data']) {
    const passthrough = data?.passthrough?.trim();
    if (passthrough) {
      const byId = await this.db.query.mediaAssets.findFirst({
        where: (table, { eq: equals }) => equals(table.id, passthrough),
      });
      if (byId) return byId;
    }

    const muxId = data?.id;
    if (!muxId) return null;

    return this.db.query.mediaAssets.findFirst({
      where: (table, { eq: equals }) => equals(table.externalAssetId, muxId),
    });
  }

  private async publish(
    asset: typeof mediaAssets.$inferSelect,
    event: MuxWebhookEvent,
  ): Promise<MuxWebhookResult> {
    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, asset.postId),
    });

    if (!post || post.status === 'removed') {
      return { ok: true, ignored: true };
    }

    const playbackId = publicPlaybackId(event.data);
    const videoTrack = event.data?.tracks?.find((track) => track.type === 'video');
    const durationMs =
      typeof event.data?.duration === 'number' && Number.isFinite(event.data.duration)
        ? Math.round(event.data.duration * 1000)
        : asset.durationMs;
    const variants: MediaVariants = {
      ...asset.variants,
      ...(playbackId ? { hls: playbackId } : {}),
    };

    await this.db
      .update(mediaAssets)
      .set({
        externalProvider: MUX_PROVIDER,
        externalAssetId: event.data?.id ?? asset.externalAssetId,
        processingStatus: 'ready',
        processingError: null,
        variants,
        width: videoTrack?.max_width ?? asset.width,
        height: videoTrack?.max_height ?? asset.height,
        durationMs,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, asset.id));

    if (post.status !== 'published') {
      await this.db
        .update(posts)
        .set({ status: 'published', publishedAt: post.publishedAt ?? new Date() })
        .where(eq(posts.id, post.id));
    }

    this.logger.log(`published post ${post.id} from Mux asset ${event.data?.id ?? asset.externalAssetId}`);
    return { ok: true, already: post.status === 'published', status: 'published' };
  }

  private async fail(
    asset: typeof mediaAssets.$inferSelect,
    event: MuxWebhookEvent,
  ): Promise<MuxWebhookResult> {
    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, asset.postId),
    });

    if (!post || post.status === 'removed' || post.status === 'published') {
      return { ok: true, ignored: true };
    }

    const message =
      event.data?.errors?.messages?.filter(Boolean).join('; ') ||
      event.data?.errors?.type ||
      'Mux ingest failed';

    await this.db
      .update(mediaAssets)
      .set({
        externalProvider: MUX_PROVIDER,
        externalAssetId: event.data?.id ?? asset.externalAssetId,
        processingStatus: 'failed',
        processingError: message,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, asset.id));

    await this.db.update(posts).set({ status: 'failed' }).where(eq(posts.id, post.id));

    this.logger.error(`Mux ingest failed for post ${post.id}: ${message}`);
    return { ok: true, status: 'failed' };
  }
}

export function publicPlaybackId(data: MuxWebhookEvent['data']): string | null {
  const ids = data?.playback_ids ?? [];
  return ids.find((item) => item.policy === 'public' && item.id)?.id ?? ids[0]?.id ?? null;
}
