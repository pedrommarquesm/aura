import { index, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { authProvider } from './enums';
import { users } from './users';

/**
 * A proof of identity from a provider, linked to one of our users.
 *
 * Split from `users` so the same person can sign in with Apple on iPhone and
 * Google on Android, and so phone verification can be added later without
 * touching the ledger. See docs/backend-architecture.md §12.4.
 */
export const authIdentities = pgTable(
  'auth_identities',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    provider: authProvider('provider').notNull(),
    /**
     * The provider's stable subject id. Identity keys on this and never on
     * email: Apple's private relay addresses make email unreliable.
     */
    providerSub: text('provider_sub').notNull(),

    /**
     * Apple returns name and email only on the very first authorization, so
     * whatever arrived then is persisted here. It may be a relay address.
     */
    emailAtSignup: text('email_at_signup'),

    /**
     * scrypt hash. Only set when `provider = 'password'`. OAuth rows stay null.
     * Local and staging only — production refuses password routes.
     */
    passwordHash: text('password_hash'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('auth_identities_provider_sub_idx').on(table.provider, table.providerSub),
    index('auth_identities_user_idx').on(table.userId),
  ],
);

/**
 * One row per signed-in device.
 *
 * Gives us "log out my other devices", instant revocation on ban, and a
 * device fingerprint for multi-account detection.
 */
export const deviceSessions = pgTable(
  'device_sessions',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Hash only. A leaked database must not yield usable refresh tokens. */
    refreshTokenHash: text('refresh_token_hash').notNull(),

    /**
     * Rotation lineage. Presenting an already-used token means it was stolen
     * and replayed, so the whole family is revoked at once.
     */
    familyId: text('family_id').notNull(),

    deviceName: varchar('device_name', { length: 120 }),
    platform: varchar('platform', { length: 20 }),
    appVersion: varchar('app_version', { length: 20 }),
    ipAtIssue: varchar('ip_at_issue', { length: 45 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('device_sessions_refresh_hash_idx').on(table.refreshTokenHash),
    index('device_sessions_user_idx').on(table.userId, table.lastSeenAt.desc()),
    index('device_sessions_family_idx').on(table.familyId),
  ],
);

export type AuthIdentity = typeof authIdentities.$inferSelect;
export type DeviceSession = typeof deviceSessions.$inferSelect;
