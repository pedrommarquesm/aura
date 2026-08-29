import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { users } from './users';

/**
 * Viewer hides someone, and is hidden from them. The feed drops both
 * directions so a blocked author cannot keep showing up by posting again.
 */
export const blocks = pgTable(
  'blocks',
  {
    blockerId: text('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: text('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index('blocks_blocked_idx').on(table.blockedId),
  ],
);

export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;
