import { describe, expect, it } from 'vitest';

import { MuxWebhookService } from './mux-webhook.service';

function fakeDb(asset: Record<string, unknown> | null, post: Record<string, unknown> | null) {
  const updates: Array<{ values: Record<string, unknown> }> = [];

  return {
    updates,
    query: {
      mediaAssets: {
        findFirst: () => Promise.resolve(asset),
      },
      posts: {
        findFirst: () => Promise.resolve(post),
      },
    },
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          updates.push({ values });
          return Promise.resolve();
        },
      }),
    }),
  };
}

const asset = {
  id: 'asset-1',
  postId: 'post-1',
  variants: {},
  durationMs: 4_000,
  width: null,
  height: null,
  externalAssetId: null,
};

describe('MuxWebhookService', () => {
  it('ignores events that are not ready or errored', async () => {
    const db = fakeDb(asset, { id: 'post-1', status: 'processing', publishedAt: null });
    const service = new MuxWebhookService(db as never);

    await expect(service.handle({ type: 'video.asset.created', data: { id: 'mux-1' } })).resolves.toEqual({
      ok: true,
      ignored: true,
    });
    expect(db.updates).toHaveLength(0);
  });

  it('publishes on video.asset.ready and stores the playback id', async () => {
    const db = fakeDb(asset, { id: 'post-1', status: 'processing', publishedAt: null });
    const service = new MuxWebhookService(db as never);

    const result = await service.handle({
      type: 'video.asset.ready',
      data: {
        id: 'mux-1',
        passthrough: 'asset-1',
        duration: 7.4,
        playback_ids: [{ id: 'playback1', policy: 'public' }],
        tracks: [{ type: 'video', max_width: 1080, max_height: 1920 }],
      },
    });

    expect(result).toEqual({ ok: true, already: false, status: 'published' });
    expect(db.updates.some((update) => update.values.processingStatus === 'ready')).toBe(true);
    expect(db.updates.some((update) => (update.values.variants as { hls?: string })?.hls === 'playback1')).toBe(
      true,
    );
    expect(db.updates.some((update) => update.values.status === 'published')).toBe(true);
    expect(db.updates.some((update) => update.values.durationMs === 7400)).toBe(true);
  });

  it('marks the post failed on video.asset.errored', async () => {
    const db = fakeDb(asset, { id: 'post-1', status: 'processing', publishedAt: null });
    const service = new MuxWebhookService(db as never);

    const result = await service.handle({
      type: 'video.asset.errored',
      data: {
        id: 'mux-1',
        passthrough: 'asset-1',
        errors: { type: 'invalid_input', messages: ['not a video'] },
      },
    });

    expect(result).toEqual({ ok: true, status: 'failed' });
    expect(db.updates.some((update) => update.values.processingStatus === 'failed')).toBe(true);
    expect(db.updates.some((update) => update.values.status === 'failed')).toBe(true);
  });

  it('does not unpublish a post that is already live', async () => {
    const db = fakeDb(
      { ...asset, processingStatus: 'ready', externalAssetId: 'mux-1' },
      { id: 'post-1', status: 'published', publishedAt: new Date() },
    );
    const service = new MuxWebhookService(db as never);

    const result = await service.handle({
      type: 'video.asset.errored',
      data: { id: 'mux-1', passthrough: 'asset-1', errors: { type: 'late' } },
    });

    expect(result.ignored).toBe(true);
    expect(db.updates.some((update) => update.values.status === 'failed')).toBe(false);
  });
});
