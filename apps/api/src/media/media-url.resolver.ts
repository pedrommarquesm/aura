import { Inject, Injectable } from '@nestjs/common';

import { ENV, type Env } from '../config/env';
import type { MediaVariants } from '../db/schema';

import { MUX_PROVIDER } from './mux.service';

export type StorageProviderName = 'r2' | 's3' | 'bunny' | 'local';

export interface MediaLocation {
  provider: StorageProviderName;
  bucket: string;
}

export interface MediaTransform {
  width?: number;
  quality?: number;
}

export interface MediaCardCoords {
  location?: MediaLocation;
  variants: MediaVariants;
  externalProvider?: string | null;
}

export interface MediaCardUrls {
  thumbUrl: string | null;
  feedUrl: string | null;
  posterUrl: string | null;
  hlsUrl: string | null;
}

/**
 * Builds public media URLs from stored coordinates.
 *
 * The database holds `storage_provider` + `storage_bucket` + a provider-neutral
 * key; URLs are assembled here at read time. That is what keeps a CDN or
 * storage change from becoming a rewrite of the largest table we have, and from
 * breaking every link already shared.
 *
 * Everything is served from our own domain, so swapping the vendor behind it is
 * a DNS change rather than a data migration.
 *
 * See docs/backend-architecture.md §6.6.
 */
@Injectable()
export class MediaUrlResolver {
  constructor(@Inject(ENV) private readonly env: Env) {}

  /**
   * Per-provider base URLs, so a migration can serve old and new assets at the
   * same time. Assets already on the previous provider keep resolving from
   * where they are while new uploads land elsewhere — which is exactly what
   * per-asset provenance buys and why there is no big-bang cutover.
   *
   * Optional. Anything unlisted uses the default base.
   */
  private get providerBases(): Partial<Record<StorageProviderName, string>> {
    if (!this.env.MEDIA_PROVIDER_BASE_URLS) return {};

    try {
      return JSON.parse(this.env.MEDIA_PROVIDER_BASE_URLS) as Partial<
        Record<StorageProviderName, string>
      >;
    } catch {
      // Never fail a feed render over a malformed override.
      return {};
    }
  }

  /**
   * Feed/admin card URLs. Mux playback ids are coordinates (`variants.hls`),
   * not storage keys — those become `stream.mux.com` / `image.mux.com`.
   */
  card(coords: MediaCardCoords): MediaCardUrls {
    const playbackId = muxPlaybackId(coords.externalProvider, coords.variants.hls);
    if (playbackId) {
      return {
        hlsUrl: `https://stream.mux.com/${playbackId}.m3u8`,
        thumbUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=400`,
        posterUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1080`,
        // HLS is the playable rendition. Do not point `feedUrl` at the R2
        // master — that file is the archive, not what the feed plays.
        feedUrl: null,
      };
    }

    return {
      thumbUrl: this.url(coords.location, coords.variants.thumb),
      feedUrl: this.url(coords.location, coords.variants.feed),
      posterUrl: this.url(coords.location, coords.variants.poster),
      hlsUrl: this.url(coords.location, coords.variants.hls),
    };
  }

  url(
    location: MediaLocation | undefined,
    key: string | undefined,
    transform?: MediaTransform,
  ): string | null {
    if (!key) return null;

    const override = location ? this.providerBases[location.provider] : undefined;
    const base = (override ?? this.env.MEDIA_CDN_BASE_URL).replace(/\/+$/, '');
    const path = key.replace(/^\/+/, '');

    // Transform syntax is provider-specific, and this is exactly where vendor
    // lock-in leaks into application code one call site at a time. Callers ask
    // for a width; they never assemble a query string.
    if (!transform || (!transform.width && !transform.quality)) {
      return `${base}/${path}`;
    }

    switch (this.env.MEDIA_EDGE) {
      case 'cloudflare': {
        const options = [
          transform.width ? `width=${transform.width}` : null,
          transform.quality ? `quality=${transform.quality}` : null,
          'format=auto',
        ]
          .filter(Boolean)
          .join(',');

        return `${base}/cdn-cgi/image/${options}/${path}`;
      }

      case 'bunny': {
        const params = new URLSearchParams();
        if (transform.width) params.set('width', String(transform.width));
        if (transform.quality) params.set('quality', String(transform.quality));

        return `${base}/${path}?${params.toString()}`;
      }

      default:
        // No edge transformer configured: serve the stored rendition as-is
        // rather than emitting a URL that silently 404s.
        return `${base}/${path}`;
    }
  }
}

/** Mux playback ids are alphanumeric. A slash means this is still a storage key. */
export function muxPlaybackId(
  provider: string | null | undefined,
  value: string | undefined,
): string | null {
  if (provider !== MUX_PROVIDER || !value) return null;
  return /^[A-Za-z0-9]+$/.test(value) ? value : null;
}
