import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

import { variantKey } from './media-keys';
import { MediaUrlResolver } from './media-url.resolver';
import { MemoryObjectStore } from './memory.object-store';
import { ProcessMediaService } from './process-media.service';

function fakeDb(
  asset: {
    id: string;
    postId: string;
    storageKey: string;
    contentType: string;
    storageProvider?: 'r2';
    storageBucket?: string;
    processingStatus?: 'pending' | 'processing' | 'ready' | 'failed';
    externalAssetId?: string | null;
    variants?: Record<string, string>;
    byteSize?: number;
  },
) {
  const updates: Array<{ values: Record<string, unknown> }> = [];

  return {
    updates,
    query: {
      mediaAssets: {
        findFirst: () => Promise.resolve(asset),
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

function resolver() {
  return new MediaUrlResolver({
    MEDIA_CDN_BASE_URL: 'https://cdn.auraclimb.com',
    MEDIA_EDGE: 'none',
  } as never);
}

describe('ProcessMediaService', () => {
  it('writes feed and thumb jpegs from a photo master and publishes', async () => {
    const store = new MemoryObjectStore();
    const assetId = '11111111-1111-7111-8111-111111111111';
    const postId = '22222222-2222-7222-8222-222222222222';
    const key = `media/${assetId}/v1/master.jpg`;

    const jpeg = await sharp({
      create: { width: 32, height: 40, channels: 3, background: { r: 200, g: 40, b: 80 } },
    })
      .jpeg()
      .toBuffer();

    await store.put(key, jpeg, { contentType: 'image/jpeg' });

    const db = fakeDb({ id: assetId, postId, storageKey: key, contentType: 'image/jpeg' });
    const mux = { ingestConfigured: true, createAsset: vi.fn() };
    const service = new ProcessMediaService(db as never, store, mux as never, resolver());

    const result = await service.process({ postId, mediaAssetId: assetId });

    expect(result).toEqual({ postId, status: 'published' });
    expect(mux.createAsset).not.toHaveBeenCalled();
    expect(await store.head(variantKey(assetId, 'feed'))).toMatchObject({ contentType: 'image/jpeg' });
    expect(await store.head(variantKey(assetId, 'thumb'))).toMatchObject({ contentType: 'image/jpeg' });
    expect(db.updates.some((update) => update.values.status === 'published')).toBe(true);
  });

  it('asks Mux to ingest the public master and does not publish yet', async () => {
    const store = new MemoryObjectStore();
    const assetId = '33333333-3333-7333-8333-333333333333';
    const postId = '44444444-4444-7444-8444-444444444444';
    const key = `media/${assetId}/v1/master.mp4`;

    await store.put(key, Buffer.from('fake-mp4'), { contentType: 'video/mp4' });

    const db = fakeDb({
      id: assetId,
      postId,
      storageKey: key,
      contentType: 'video/mp4',
      storageProvider: 'r2',
      storageBucket: 'aura-media',
      variants: {},
      byteSize: 8,
    });
    const mux = {
      ingestConfigured: true,
      createAsset: vi.fn().mockResolvedValue({ id: 'mux_asset_1', playbackId: 'playback1' }),
    };
    const service = new ProcessMediaService(db as never, store, mux as never, resolver());

    const result = await service.process({ postId, mediaAssetId: assetId });

    expect(result).toEqual({ postId, status: 'processing' });
    expect(mux.createAsset).toHaveBeenCalledWith({
      sourceUrl: `https://cdn.auraclimb.com/${key}`,
      passthrough: assetId,
    });
    expect(db.updates.some((update) => update.values.status === 'published')).toBe(false);
    expect(db.updates.some((update) => update.values.externalAssetId === 'mux_asset_1')).toBe(true);
    expect(db.updates.some((update) => update.values.externalProvider === 'mux')).toBe(true);
  });

  it('does not create a second Mux asset when ingest already started', async () => {
    const store = new MemoryObjectStore();
    const assetId = '55555555-5555-7555-8555-555555555555';
    const postId = '66666666-6666-7666-8666-666666666666';
    const key = `media/${assetId}/v1/master.mp4`;
    await store.put(key, Buffer.from('fake-mp4'), { contentType: 'video/mp4' });

    const db = fakeDb({
      id: assetId,
      postId,
      storageKey: key,
      contentType: 'video/mp4',
      processingStatus: 'processing',
      externalAssetId: 'mux_existing',
    });
    const mux = { ingestConfigured: true, createAsset: vi.fn() };
    const service = new ProcessMediaService(db as never, store, mux as never, resolver());

    const result = await service.process({ postId, mediaAssetId: assetId });

    expect(result.status).toBe('processing');
    expect(mux.createAsset).not.toHaveBeenCalled();
  });

  it('fails video when Mux is not configured, rather than publishing the master', async () => {
    const store = new MemoryObjectStore();
    const assetId = '77777777-7777-7777-8777-777777777777';
    const postId = '88888888-8888-7888-8888-888888888888';
    const key = `media/${assetId}/v1/master.mp4`;
    await store.put(key, Buffer.from('fake-mp4'), { contentType: 'video/mp4' });

    const db = fakeDb({
      id: assetId,
      postId,
      storageKey: key,
      contentType: 'video/mp4',
      storageProvider: 'r2',
      storageBucket: 'aura-media',
    });
    const mux = { ingestConfigured: false, createAsset: vi.fn() };
    const service = new ProcessMediaService(db as never, store, mux as never, resolver());

    const result = await service.process({ postId, mediaAssetId: assetId });

    expect(result.status).toBe('failed');
    expect(mux.createAsset).not.toHaveBeenCalled();
    expect(db.updates.some((update) => update.values.status === 'failed')).toBe(true);
  });
});
