import { bigint, index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { auraEventType } from './enums';
import { posts } from './posts';
import { users } from './users';

/**
 * The Aura ledger. Source of truth for the entire economy.
 *
 * Every movement of Aura is a row here, written in the same transaction as the
 * counter updates on `users` and `posts`. Nothing else may touch those
 * counters. This is what makes auditing, fraud investigation, reversals,
 * and recomputing Vote Power against history possible.
 *
 * Expect this to become the largest table in the system. Partition by month
 * before it hurts, not after. See docs/backend-architecture.md §7 and §25 of
 * the product spec.
 */
export const auraEvents = pgTable(
  'aura_events',
  {
    id: text('id').primaryKey().$defaultFn(newId),

    /** Who receives the Aura. */
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Who caused it: the liker, or null for system grants. */
    sourceUserId: text('source_user_id').references(() => users.id, { onDelete: 'set null' }),

    postId: text('post_id').references(() => posts.id, { onDelete: 'set null' }),

    type: auraEventType('type').notNull(),

    /** Signed integer. Negative for REVERSAL. Aura is never fractional. */
    amount: bigint('amount', { mode: 'number' }).notNull(),

    /**
     * Vote Power applied, reversal reason, moderation case id, and similar
     * context. Never queried on the hot path; kept for investigation.
     */
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    /**
     * Caller-supplied key for retry-safe writes. Unique when present, so a
     * mobile client retrying over a flaky network cannot double-apply Aura.
     */
    idempotencyKey: text('idempotency_key'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('aura_events_user_idx').on(table.userId, table.createdAt.desc()),
    index('aura_events_post_idx').on(table.postId, table.createdAt.desc()),
    // Graph analysis for like-rings and coordinated farming.
    index('aura_events_source_user_idx').on(table.sourceUserId, table.createdAt.desc()),
    uniqueIndex('aura_events_idempotency_key_idx').on(table.idempotencyKey),
  ],
);

export type AuraEvent = typeof auraEvents.$inferSelect;
export type NewAuraEvent = typeof auraEvents.$inferInsert;
