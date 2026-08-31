import { index, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

import { posts } from './posts';

/**
 * Extracted hashtags for a post. Caption stays the source of truth;
 * this table exists so `/hashtags/:tag` does not scan every caption.
 *
 * Tags are stored lowercase. Display uses the caption as authored.
 */
export const postHashtags = pgTable(
  'post_hashtags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tag] }),
    index('post_hashtags_tag_idx').on(table.tag),
  ],
);

export type PostHashtag = typeof postHashtags.$inferSelect;
export type NewPostHashtag = typeof postHashtags.$inferInsert;
