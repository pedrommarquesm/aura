import { describe, expect, it } from 'vitest';

import type { Env } from '../config/env';

import { MediaUrlResolver, type MediaLocation } from './media-url.resolver';

function resolver(overrides: Partial<Env> = {}): MediaUrlResolver {
  return new MediaUrlResolver({
    MEDIA_CDN_BASE_URL: 'https://cdn.aurarankd.com',
    MEDIA_EDGE: 'cloudflare',
    ...overrides,
  } as Env);
}

const r2: MediaLocation = { provider: 'r2', bucket: 'aura-media' };
const bunny: MediaLocation = { provider: 'bunny', bucket: 'aura-media' };
const KEY = 'media/abc/v1/feed.jpg';

describe('MediaUrlResolver', () => {
  it('serves from our own domain, not the storage provider', () => {
    expect(resolver().url(r2, KEY)).toBe('https://cdn.aurarankd.com/media/abc/v1/feed.jpg');
  });

  it('returns null when there is no key rather than a broken URL', () => {
    expect(resolver().url(r2, undefined)).toBeNull();
  });

  it('uses Cloudflare transform syntax', () => {
    expect(resolver().url(r2, KEY, { width: 1080, quality: 85 })).toBe(
      'https://cdn.aurarankd.com/cdn-cgi/image/width=1080,quality=85,format=auto/media/abc/v1/feed.jpg',
    );
  });

  it('uses Bunny transform syntax for the same request', () => {
    // The same caller intent produces different URLs per edge. This is why
    // transform syntax lives here and never in a component.
    expect(resolver({ MEDIA_EDGE: 'bunny' }).url(r2, KEY, { width: 1080 })).toBe(
      'https://cdn.aurarankd.com/media/abc/v1/feed.jpg?width=1080',
    );
  });

  it('emits an untransformed URL when no edge transformer is configured', () => {
    expect(resolver({ MEDIA_EDGE: 'none' }).url(r2, KEY, { width: 1080 })).toBe(
      'https://cdn.aurarankd.com/media/abc/v1/feed.jpg',
    );
  });

  it('resolves each asset from its own provider during a migration', () => {
    // The point of per-asset provenance: assets already on the old provider
    // keep resolving from where they are while new uploads go elsewhere.
    const migrating = resolver({
      MEDIA_PROVIDER_BASE_URLS: JSON.stringify({ bunny: 'https://b-cdn.aurarankd.com' }),
    });

    expect(migrating.url(r2, KEY)).toBe('https://cdn.aurarankd.com/media/abc/v1/feed.jpg');
    expect(migrating.url(bunny, KEY)).toBe('https://b-cdn.aurarankd.com/media/abc/v1/feed.jpg');
  });

  it('ignores a malformed provider override rather than failing a feed render', () => {
    const broken = resolver({ MEDIA_PROVIDER_BASE_URLS: 'not json' });

    expect(broken.url(bunny, KEY)).toBe('https://cdn.aurarankd.com/media/abc/v1/feed.jpg');
  });

  it('does not double up slashes', () => {
    const trailing = resolver({ MEDIA_CDN_BASE_URL: 'https://cdn.aurarankd.com/' });

    expect(trailing.url(r2, '/media/abc/v1/feed.jpg')).toBe(
      'https://cdn.aurarankd.com/media/abc/v1/feed.jpg',
    );
  });
});
