import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { likeKind } from './enums';
import { posts } from './posts';
import { users } from './users';

/**
 * The hottest write in the product.
 *
 * The composite primary key is the idempotency mechanism: a double-tapped
 * like, or a retry from a flaky mobile network, conflicts instead of awarding
 * Aura twice.
 */
export const likes = pgTable(
  'likes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    kind: likeKind('kind').notNull().default('like'),

    /**
     * The ledger event this like created. Unliking reverses *this* amount
     * rather than recomputing what a like would be worth today, which matters
     * once Vote Power makes that value change over time.
     */
    auraEventId: text('aura_event_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    index('likes_post_idx').on(table.postId, table.createdAt.desc()),
    // Batch "did I like these?" for a feed page, and abuse investigation.
    index('likes_user_idx').on(table.userId, table.createdAt.desc()),
  ],
);

export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
