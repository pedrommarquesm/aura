import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { staffAuthProvider, staffRole, staffStatus } from './enums';

/**
 * Internal operator. Completely separate from `users` — a staff row is never
 * a consumer account, never earns Aura, and never appears on a leaderboard.
 *
 * Invites are keyed on email (the thing an admin types). After the first
 * Google sign-in we also store `staff_identities.provider_sub`, which is the
 * stable key for later logins. See docs/backend-architecture.md §12.4 for why
 * consumer auth keys on `sub` and never email; staff is the inverse because
 * the invite *is* the email.
 */
export const staff = pgTable(
  'staff',
  {
    id: text('id').primaryKey().$defaultFn(newId),

    email: varchar('email', { length: 320 }).notNull(),
    displayName: varchar('display_name', { length: 80 }),

    role: staffRole('role').notNull().default('moderator'),
    status: staffStatus('status').notNull().default('invited'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('staff_email_lower_idx').on(sql`lower(${table.email})`),
    index('staff_role_idx').on(table.role, table.status),
  ],
);

/**
 * A proof of identity from a provider, linked to one staff row.
 *
 * `email` is reserved so org-domain password / magic-link sign-in can land
 * later without touching `staff` or consumer `auth_identities`.
 */
export const staffIdentities = pgTable(
  'staff_identities',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    staffId: text('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),

    provider: staffAuthProvider('provider').notNull(),
    providerSub: text('provider_sub').notNull(),
    emailAtSignup: text('email_at_signup'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('staff_identities_provider_sub_idx').on(table.provider, table.providerSub),
    index('staff_identities_staff_idx').on(table.staffId),
  ],
);

/**
 * One row per signed-in backoffice session. Same rotation/reuse-detection
 * shape as consumer `device_sessions`, but it never shares a table with them.
 */
export const staffSessions = pgTable(
  'staff_sessions',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    staffId: text('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),

    refreshTokenHash: text('refresh_token_hash').notNull(),
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
    uniqueIndex('staff_sessions_refresh_hash_idx').on(table.refreshTokenHash),
    index('staff_sessions_staff_idx').on(table.staffId, table.lastSeenAt.desc()),
    index('staff_sessions_family_idx').on(table.familyId),
  ],
);

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type StaffIdentity = typeof staffIdentities.$inferSelect;
export type StaffSession = typeof staffSessions.$inferSelect;
