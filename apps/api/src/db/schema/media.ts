import { index, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { processingStatus, storageProvider } from './enums';
import { posts } from './posts';

/**
 * Variant name to storage key. Deliberately **keys, not URLs**.
 *
 * Persisting absolute URLs would make changing CDN or storage provider a
 * rewrite of the largest table we have, and would break every link already
 * shared. URLs are built at read time by the resolver.
 * See docs/backend-architecture.md §6.6.
 */
/**
 * Variant name to coordinate. Photos store object keys. Mux videos store the
 * playback id in `hls` — never a `stream.mux.com` URL. The resolver builds
 * those at read time.
 */
export type MediaVariants = Partial<Record<'feed' | 'thumb' | 'poster' | 'hls', string>>;

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    // --- Where the bytes live. Per asset, never a global setting. ---
    storageProvider: storageProvider('storage_provider').notNull(),
    storageBucket: varchar('storage_bucket', { length: 120 }).notNull(),
    storageRegion: varchar('storage_region', { length: 40 }),
    /**
     * Provider-neutral path to the original master, e.g.
     * `media/{assetId}/v1/master.mp4`. No provider, bucket, or region in the
     * key, so a bulk copy to another provider preserves paths byte-for-byte
     * and migrating an asset changes one column.
     */
    storageKey: text('storage_key').notNull(),

    contentType: varchar('content_type', { length: 100 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    checksum: varchar('checksum', { length: 128 }),

    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),

    variants: jsonb('variants').$type<MediaVariants>().notNull().default({}),

    /**
     * Set when a managed video vendor holds the playable renditions (`mux`).
     * The master above always stays in our own bucket regardless, because
     * transcoded renditions usually cannot be extracted from these vendors.
     */
    externalProvider: varchar('external_provider', { length: 40 }),
    /** Mux asset id. Playback id lives in `variants.hls`. */
    externalAssetId: varchar('external_asset_id', { length: 120 }),

    processingStatus: processingStatus('processing_status').notNull().default('pending'),
    processingError: text('processing_error'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('media_assets_post_idx').on(table.postId),
    // Answers "where does older data live" and drives the migration backfill.
    index('media_assets_provider_idx').on(table.storageProvider),
    index('media_assets_processing_idx').on(table.processingStatus),
  ],
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
