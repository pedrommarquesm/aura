import { describe, expect, it } from 'vitest';

import { extensionForContentType, masterKey, variantKey } from './media-keys';
import { MemoryObjectStore } from './memory.object-store';
import { isAcceptedContentType, mediaTypeForContentType } from './media-types';

describe('media keys', () => {
  it('keeps provider, bucket, and region out of the path', () => {
    expect(masterKey('abc', 'jpg')).toBe('media/abc/v1/master.jpg');
    expect(variantKey('abc', 'feed')).toBe('media/abc/v1/feed.jpg');
    expect(variantKey('abc', 'thumb')).toBe('media/abc/v1/thumb.jpg');
  });

  it('maps accepted content types onto extensions', () => {
    expect(extensionForContentType('image/jpeg')).toBe('jpg');
    expect(extensionForContentType('image/heic')).toBe('heic');
    expect(extensionForContentType('video/mp4')).toBe('mp4');
    expect(extensionForContentType('application/pdf')).toBeNull();
  });
});

describe('accepted media types', () => {
  it('classifies photos and videos the client is allowed to send', () => {
    expect(isAcceptedContentType('image/webp')).toBe(true);
    expect(mediaTypeForContentType('image/webp')).toBe('photo');
    expect(mediaTypeForContentType('video/mp4')).toBe('video');
    expect(isAcceptedContentType('video/x-matroska')).toBe(false);
  });
});

describe('MemoryObjectStore', () => {
  it('round-trips put/head/get/delete', async () => {
    const store = new MemoryObjectStore();
    const key = 'media/abc/v1/master.jpg';
    const body = Buffer.from([0xff, 0xd8, 0xff]);

    await store.put(key, body, { contentType: 'image/jpeg' });

    expect(await store.head(key)).toMatchObject({ contentLength: 3, contentType: 'image/jpeg' });
    expect(await store.get(key)).toEqual(body);

    await store.copy(key, 'media/abc/v1/feed.jpg', { contentType: 'image/jpeg' });
    expect((await store.head('media/abc/v1/feed.jpg'))?.contentLength).toBe(3);

    await store.delete(key);
    expect(await store.head(key)).toBeNull();
  });
});
