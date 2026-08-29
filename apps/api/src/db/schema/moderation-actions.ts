import { index, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { moderationActionType, moderationTargetType } from './enums';
import { staff } from './staff';

/**
 * Append-only audit of backoffice actions.
 *
 * This is the seam for a future appeals flow: an appeal would reference an
 * action id, not a user status column. There is no appeal table yet on
 * purpose — building one now would invent a process we do not have.
 *
 * `staff_id` is nullable so the V0 `X-Moderation-Key` path can still write
 * (scripts / break-glass) without pretending a person did it.
 */
export const moderationActions = pgTable(
  'moderation_actions',
  {
    id: text('id').primaryKey().$defaultFn(newId),

    staffId: text('staff_id').references(() => staff.id, { onDelete: 'set null' }),

    action: moderationActionType('action').notNull(),
    targetType: moderationTargetType('target_type').notNull(),
    targetId: text('target_id').notNull(),

    reason: varchar('reason', { length: 500 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('moderation_actions_target_idx').on(table.targetType, table.targetId, table.createdAt.desc()),
    index('moderation_actions_staff_idx').on(table.staffId, table.createdAt.desc()),
    index('moderation_actions_created_idx').on(table.createdAt.desc()),
  ],
);

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;
