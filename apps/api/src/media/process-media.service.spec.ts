import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { variantKey } from './media-keys';
import { MemoryObjectStore } from './memory.object-store';
import { ProcessMediaService } from './process-media.service';

function fakeDb(asset: { id: string; postId: string; storageKey: string; contentType: string }) {
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
    const service = new ProcessMediaService(db as never, store);

    const result = await service.process({ postId, mediaAssetId: assetId });

    expect(result).toEqual({ postId, status: 'published' });
    expect(await store.head(variantKey(assetId, 'feed'))).toMatchObject({ contentType: 'image/jpeg' });
    expect(await store.head(variantKey(assetId, 'thumb'))).toMatchObject({ contentType: 'image/jpeg' });
    expect(db.updates.some((update) => update.values.status === 'published')).toBe(true);
  });

  it('points video feed at the master until Stream exists', async () => {
    const store = new MemoryObjectStore();
    const assetId = '33333333-3333-7333-8333-333333333333';
    const postId = '44444444-4444-7444-8444-444444444444';
    const key = `media/${assetId}/v1/master.mp4`;

    await store.put(key, Buffer.from('fake-mp4'), { contentType: 'video/mp4' });

    const db = fakeDb({ id: assetId, postId, storageKey: key, contentType: 'video/mp4' });
    const service = new ProcessMediaService(db as never, store);

    const result = await service.process({ postId, mediaAssetId: assetId });

    expect(result.status).toBe('published');
    const variantUpdate = db.updates.find((update) => update.values.variants);
    expect(variantUpdate?.values.variants).toEqual({ feed: key });
  });
});
