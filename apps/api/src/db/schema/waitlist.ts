import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { users } from './users';

/**
 * Pre-launch waitlist. Not a user account.
 *
 * Aura earned here is a promise, not a ledger row. When the person later
 * signs up with the same email, `WaitlistService.claimForAccount` writes one
 * BONUS event and points `claimedUserId` at the new account. Until then the
 * score lives only on this row so a waitlist join cannot mint real Aura.
 */
export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: text('id').primaryKey().$defaultFn(newId),

    /** Lowercased. The join key for claiming onto a real account. */
    email: varchar('email', { length: 320 }).notNull(),

    /**
     * Public share token. Short and unambiguous so it survives being read
     * aloud or typed from a screenshot. Generated, never chosen.
     */
    referralCode: varchar('referral_code', { length: 12 }).notNull(),

    referredById: text('referred_by_id').references((): AnyPgColumn => waitlistEntries.id, {
      onDelete: 'set null',
    }),

    locale: varchar('locale', { length: 10 }).notNull().default('en'),

    /** Join bonus + referral bonuses. Ported in one BONUS event on claim. */
    aura: bigint('aura', { mode: 'number' }).notNull().default(0),

    referralCount: integer('referral_count').notNull().default(0),

    claimedUserId: text('claimed_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('waitlist_entries_email_lower_idx').on(sql`lower(${table.email})`),
    uniqueIndex('waitlist_entries_referral_code_idx').on(table.referralCode),
    uniqueIndex('waitlist_entries_claimed_user_idx').on(table.claimedUserId),
    index('waitlist_entries_referred_by_idx').on(table.referredById),
  ],
);

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type NewWaitlistEntry = typeof waitlistEntries.$inferInsert;

/**
 * Outbound mail we could not send yet (no SMTP), or that we sent.
 *
 * The waitlist must not lose a welcome or referral email because the mail
 * server is still being stood up. Queue here; flush when SMTP lands.
 */
export const emailOutbox = pgTable(
  'email_outbox',
  {
    id: text('id').primaryKey().$defaultFn(newId),

    toEmail: varchar('to_email', { length: 320 }).notNull(),
    template: varchar('template', { length: 40 }).notNull(),
    locale: varchar('locale', { length: 10 }).notNull().default('en'),
    subject: varchar('subject', { length: 200 }).notNull(),
    textBody: text('text_body').notNull(),
    htmlBody: text('html_body').notNull(),

    status: varchar('status', { length: 20 }).notNull().default('queued'),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('email_outbox_status_idx').on(table.status, table.createdAt),
    index('email_outbox_to_idx').on(table.toEmail, table.createdAt.desc()),
  ],
);

export type EmailOutboxRow = typeof emailOutbox.$inferSelect;

/**
 * Contact form submissions. Delivery target is not wired yet — persist first
 * so a later hook (email, ticket, Slack) cannot lose a message.
 */
export const contactMessages = pgTable(
  'contact_messages',
  {
    id: text('id').primaryKey().$defaultFn(newId),

    name: varchar('name', { length: 80 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    message: text('message').notNull(),
    locale: varchar('locale', { length: 10 }).notNull().default('en'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('contact_messages_created_idx').on(table.createdAt.desc())],
);

export type ContactMessage = typeof contactMessages.$inferSelect;
