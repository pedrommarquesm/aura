import { index, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { newId } from '../../common/ids';

import { reportReason, reportStatus, reportTargetType } from './enums';
import { users } from './users';

/**
 * User-submitted report. Staff review lives in `status` / `resolved_at` so the
 * queue is queryable without joining the audit log. Appeals are not modeled
 * yet — `moderation_actions` is the seam those will hang off.
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

    status: reportStatus('status').notNull().default('open'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reports_reporter_target_idx').on(table.reporterId, table.targetType, table.targetId),
    index('reports_target_idx').on(table.targetType, table.targetId, table.createdAt.desc()),
    index('reports_status_idx').on(table.status, table.createdAt.desc()),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
