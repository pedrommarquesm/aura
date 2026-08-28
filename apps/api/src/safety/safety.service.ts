import { Inject, Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { DB, type Database } from '../db/db.module';
import { blocks, reports, users } from '../db/schema';
import type { User } from '../db/schema';

export const REPORT_REASONS = ['spam', 'harassment', 'hate', 'sexual', 'violence', 'other'] as const;
export const REPORT_TARGETS = ['user', 'post'] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export interface ReportInput {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  note?: string | null;
}

@Injectable()
export class SafetyService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async report(actor: User, input: ReportInput): Promise<{ id: string; created: boolean }> {
    await this.assertReportable(actor.id, input);

    const inserted = await this.db
      .insert(reports)
      .values({
        reporterId: actor.id,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        note: input.note?.trim() ? input.note.trim().slice(0, 500) : null,
      })
      .onConflictDoNothing()
      .returning({ id: reports.id });

    if (inserted[0]) return { id: inserted[0].id, created: true };

    const existing = await this.db.query.reports.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(
          equals(table.reporterId, actor.id),
          both(equals(table.targetType, input.targetType), equals(table.targetId, input.targetId)),
        ),
    });

    if (!existing) throw AppError.conflict(ErrorCode.ALREADY_REPORTED, 'You already reported that');

    return { id: existing.id, created: false };
  }

  async block(actor: User, targetUserId: string): Promise<{ created: boolean }> {
    if (actor.id === targetUserId) {
      throw new AppError(ErrorCode.CANNOT_BLOCK_SELF, 'You cannot block yourself', 403);
    }

    const target = await this.requireUser(targetUserId);

    const inserted = await this.db
      .insert(blocks)
      .values({ blockerId: actor.id, blockedId: target.id })
      .onConflictDoNothing()
      .returning({ blockerId: blocks.blockerId });

    return { created: inserted.length > 0 };
  }

  async unblock(actor: User, targetUserId: string): Promise<{ removed: boolean }> {
    const deleted = await this.db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, actor.id), eq(blocks.blockedId, targetUserId)))
      .returning({ blockerId: blocks.blockerId });

    return { removed: deleted.length > 0 };
  }

  /**
   * Authors the viewer must not see: people they blocked, and people who
   * blocked them. Applied on every authenticated feed read.
   */
  async hiddenAuthorIds(viewerId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({
        blockerId: blocks.blockerId,
        blockedId: blocks.blockedId,
      })
      .from(blocks)
      .where(or(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, viewerId)));

    const hidden = new Set<string>();
    for (const row of rows) {
      hidden.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
    }
    return hidden;
  }

  private async assertReportable(actorId: string, input: ReportInput): Promise<void> {
    if (input.targetType === 'user') {
      if (input.targetId === actorId) {
        throw new AppError(ErrorCode.CANNOT_REPORT_SELF, 'You cannot report yourself', 403);
      }
      await this.requireUser(input.targetId);
      return;
    }

    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, input.targetId),
    });

    if (!post || post.status === 'removed') throw AppError.notFound('Post not found');
    if (post.authorId === actorId) {
      throw new AppError(ErrorCode.CANNOT_REPORT_SELF, 'You cannot report your own post', 403);
    }
  }

  private async requireUser(userId: string) {
    const [row] = await this.db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row || row.status === 'banned') throw AppError.notFound('User not found');
    return row;
  }
}
