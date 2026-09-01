import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { posts } from './posts';
import { users } from './users';

/** Max characters for an optional receipt. Keeps floating overlays legible. */
export const RECEIPT_MAX_LENGTH = 80;

/** Hard cap on a single vote's magnitude. Locked, see docs/redesign-tracker.md Q1/Q7. */
export const MAX_VOTE_AURA = 100;

/**
 * The hottest write in the product, and the only way Aura moves.
 *
 * A vote replaces the old binary like: one user grants a signed integer
 * amount to one post, once. The composite primary key is the idempotency
 * mechanism — a double-release of the slider, or a retry from a flaky mobile
 * network, conflicts instead of casting a second vote. There is no unvote:
 * once released, the amount is permanent (docs/redesign-tracker.md Q2/Q3).
 *
 * `receipt` is optional text attached to this exact vote. It may be set once
 * after the vote is cast if it was left empty at release, then it freezes —
 * enforced in `VotesService`, not here.
 */
export const votes = pgTable(
  'votes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    /** Signed, nonzero, -100..100. Never 0 — a 0 release is a client-side cancel. */
    amount: integer('amount').notNull(),

    /** Optional text, max 80 chars. Null until set, then frozen. */
    receipt: varchar('receipt', { length: RECEIPT_MAX_LENGTH }),

    /**
     * The ledger event this vote created. There is no reversal path for a
     * vote (unlike the old like/unlike), but keeping the link matches the
     * pattern the rest of the ledger uses and helps investigation.
     */
    auraEventId: text('aura_event_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    // Ledger reads newest-first (docs/redesign-tracker.md Q6).
    index('votes_post_idx').on(table.postId, table.createdAt.desc()),
    index('votes_user_idx').on(table.userId, table.createdAt.desc()),
    check('votes_amount_nonzero', sql`${table.amount} <> 0`),
    check(
      'votes_amount_in_range',
      sql`${table.amount} >= -${sql.raw(String(MAX_VOTE_AURA))} AND ${table.amount} <= ${sql.raw(String(MAX_VOTE_AURA))}`,
    ),
  ],
);

export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
