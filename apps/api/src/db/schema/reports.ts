import { index, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { reportReason, reportTargetType } from './enums';
import { users } from './users';

/**
 * Thin V0 report. One row per reporter + target; a second tap is a no-op.
 * Review and takedown are later (TS-03, TS-12).
 */
export const reports = pgTable(
  'reports',
  {
    id: text('id').primaryKey().$defaultFn(newId),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    targetType: reportTargetType('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: reportReason('reason').notNull(),
    note: varchar('note', { length: 500 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reports_reporter_target_idx').on(table.reporterId, table.targetType, table.targetId),
    index('reports_target_idx').on(table.targetType, table.targetId, table.createdAt.desc()),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
