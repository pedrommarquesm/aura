import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { posts } from './posts';
import { users } from './users';

/**
 * Flat comments on a published post.
 *
 * No replies, no likes-on-comments, no Aura. The feed never joins this table;
 * `posts.comment_count` is the denormalized read model for the icon.
 */
export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    body: text('body').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Oldest-first thread cursor: (created_at, id) > last item.
    index('comments_post_created_idx').on(table.postId, table.createdAt, table.id),
  ],
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
