import { sql } from 'drizzle-orm';
import {
  bigint,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { mediaType, postStatus } from './enums';
import { users } from './users';

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    caption: text('caption'),
    mediaType: mediaType('media_type').notNull(),
    status: postStatus('status').notNull().default('uploading'),

    // Denormalized read models. The ledger and the likes table remain
    // authoritative; these exist so the feed never aggregates on read.
    likeCount: integer('like_count').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    aura: bigint('aura', { mode: 'number' }).notNull().default(0),

    /** Maintained by the trending worker, never computed during a feed read. */
    trendingScore: doublePrecision('trending_score').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set when the media pipeline finishes. Null until then. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    // Latest feed. Partial index: only published posts are ever served, so the
    // index stays small and skips the upload pipeline's churn entirely.
    index('posts_published_at_idx')
      .on(table.publishedAt.desc(), table.id.desc())
      .where(sql`${table.status} = 'published'`),

    // Trending feed, same reasoning.
    index('posts_trending_idx')
      .on(table.trendingScore.desc(), table.id.desc())
      .where(sql`${table.status} = 'published'`),

    // Profile grid.
    index('posts_author_idx').on(table.authorId, table.publishedAt.desc()),
  ],
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
