import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { userStatus } from './enums';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(newId),

    username: varchar('username', { length: 30 }).notNull(),
    displayName: varchar('display_name', { length: 60 }),
    avatarUrl: text('avatar_url'),

    // Nullable in V0. Needed once country and city leaderboards land.
    country: char('country', { length: 2 }),
    city: varchar('city', { length: 120 }),

    /**
     * Materialized sum of this user's aura_events. The ledger is the source of
     * truth; if this ever drifts, the reconciliation job rebuilds it.
     * bigint because a popular account accumulates far past a 32-bit integer.
     */
    aura: bigint('aura', { mode: 'number' }).notNull().default(0),

    // V1 columns, defaulted and unused in V0. Present now so enabling Vote
    // Power is a migration-free change. See docs/backend-architecture.md §7.5.
    auraSense: numeric('aura_sense', { precision: 5, scale: 4 }),
    votePower: numeric('vote_power', { precision: 6, scale: 3 }).notNull().default('1'),

    title: varchar('title', { length: 40 }),
    streak: integer('streak').notNull().default(0),

    status: userStatus('status').notNull().default('active'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Case-insensitive uniqueness: @Pedro and @pedro must not both exist.
    uniqueIndex('users_username_lower_idx').on(sql`lower(${table.username})`),
    // Bootstraps the global leaderboard and backs the Redis rebuild job.
    index('users_aura_idx').on(table.aura.desc(), table.id),
    index('users_country_aura_idx').on(table.country, table.aura.desc()),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
