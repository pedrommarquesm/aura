import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';

import { AuraLedgerService } from '../aura/aura-ledger.service';
import { TokensService } from '../auth/tokens.service';
import { AppError } from '../common/errors/app-error';
import { newId } from '../common/ids';
import { DB, type Database } from '../db/db.module';
import {
  moderationActions,
  posts,
  reports,
  users,
  type ModerationAction,
  type Post,
  type User,
} from '../db/schema';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

import { takedownIdempotencyKey, takedownReversalAmount } from './post-takedown';

export type UserStatus = User['status'];

export interface StatusChangeResult {
  userId: string;
  status: UserStatus;
  changed: boolean;
}

export interface RemovePostResult {
  postId: string;
  status: Post['status'];
  reversedAura: number;
  alreadyRemoved: boolean;
}

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly tokens: TokensService,
    private readonly ledger: AuraLedgerService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  /**
   * Suspend, ban, or reinstate a user.
   *
   * A ban or suspension revokes every device session immediately. Access
   * tokens are short-lived JWTs and cannot be revoked mid-life, so burning
   * the sessions is what makes the next request fail rather than waiting
   * up to 15 minutes. A ban also drops the user from the live leaderboard.
   */
  async setUserStatus(
    userId: string,
    status: UserStatus,
    actor?: { staffId?: string; reason?: string },
  ): Promise<StatusChangeResult> {
    const user = await this.db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, userId),
    });

    if (!user) throw AppError.notFound('User not found');

    if (user.status === status) {
      return { userId, status, changed: false };
    }

    await this.db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId));

    if (status !== 'active') {
      await this.tokens.revokeAllForUser(userId);
    }

    if (status === 'banned') {
      await this.leaderboard.remove(userId);
    } else if (user.status === 'banned') {
      // Coming back from a ban: put the current Aura total back on the board.
      // applyDelta assumes the member already exists; upsert writes the score.
      await this.leaderboard.upsert(userId, user.aura);
    }

    await this.record({
      staffId: actor?.staffId,
      action: 'user_status',
      targetType: 'user',
      targetId: userId,
      reason: actor?.reason,
      metadata: { from: user.status, to: status },
    });

    return { userId, status, changed: true };
  }

  /**
   * Soft-delete a post and reverse the Aura it earned.
   *
   * Status flips to `removed` first so the feed and new likes stop seeing it.
   * The ledger write then zeros the remaining balance. A second pass catches
   * a like that raced the flip. Authors and moderators share this path so a
   * deleted popular post cannot keep its Aura.
   */
  async removePost(
    postId: string,
    options: {
      actorId?: string;
      staffId?: string;
      note?: string;
      reason: 'author_delete' | 'takedown';
    },
  ): Promise<RemovePostResult> {
    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, postId),
    });

    if (!post) throw AppError.notFound('Post not found');

    if (options.actorId && post.authorId !== options.actorId) {
      throw AppError.forbidden('You can only remove your own post');
    }

    if (post.status === 'removed') {
      return { postId, status: 'removed', reversedAura: 0, alreadyRemoved: true };
    }

    const [updated] = await this.db
      .update(posts)
      .set({ status: 'removed' })
      .where(eq(posts.id, postId))
      .returning();

    const reversedAura = await this.reverseRemainingAura(
      updated ?? post,
      options.actorId ?? null,
      options.reason,
    );

    if (options.reason === 'takedown') {
      await this.record({
        staffId: options.staffId,
        action: 'post_remove',
        targetType: 'post',
        targetId: postId,
        reason: options.note,
        metadata: { reversedAura },
      });
    }

    return { postId, status: 'removed', reversedAura, alreadyRemoved: false };
  }

  private async reverseRemainingAura(
    post: Post,
    actorId: string | null,
    reason: 'author_delete' | 'takedown',
  ): Promise<number> {
    let reversed = 0;

    // Two passes at most: the first covers the balance we just froze, the
    // second covers a like that landed between the status flip and the write.
    for (let pass = 0; pass < 2; pass += 1) {
      const [current] = await this.db
        .select({ aura: posts.aura, authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, post.id));

      const amount = takedownReversalAmount(current?.aura ?? 0);
      if (amount === null) break;

      await this.ledger.apply({
        userId: current!.authorId,
        sourceUserId: actorId,
        postId: post.id,
        type: 'REVERSAL',
        amount,
        metadata: { reason },
        idempotencyKey: takedownIdempotencyKey(post.id, pass),
      });

      await this.leaderboard.applyDelta(current!.authorId, amount);
      reversed += -amount;
    }

    return reversed;
  }

  async listReports(query: {
    status?: (typeof reports.$inferSelect)['status'];
    offset: number;
    limit: number;
  }): Promise<Page<ReportRow>> {
    const limit = clampPage(query.limit);
    const offset = Math.max(query.offset, 0);
    const where = query.status ? eq(reports.status, query.status) : undefined;

    const [totalRow] = await this.db.select({ total: count() }).from(reports).where(where);

    const rows = await this.db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        reporterUsername: users.username,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        note: reports.note,
        status: reports.status,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
      })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.reporterId))
      .where(where)
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      })),
      total: Number(totalRow?.total ?? 0),
      offset,
      limit,
    };
  }

  async resolveReport(
    reportId: string,
    decision: 'dismissed' | 'actioned',
    actor?: { staffId?: string; reason?: string },
  ): Promise<{ id: string; status: 'dismissed' | 'actioned'; changed: boolean }> {
    const report = await this.db.query.reports.findFirst({
      where: (table, { eq: equals }) => equals(table.id, reportId),
    });

    if (!report) throw AppError.notFound('Report not found');

    if (report.status !== 'open') {
      return { id: reportId, status: report.status, changed: false };
    }

    await this.db
      .update(reports)
      .set({ status: decision, resolvedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.status, 'open')));

    await this.record({
      staffId: actor?.staffId,
      action: decision === 'dismissed' ? 'report_dismiss' : 'report_actioned',
      targetType: 'report',
      targetId: reportId,
      reason: actor?.reason,
      metadata: { targetType: report.targetType, targetId: report.targetId },
    });

    return { id: reportId, status: decision, changed: true };
  }

  async listActions(query: { offset: number; limit: number }): Promise<Page<ActionRow>> {
    const limit = clampPage(query.limit);
    const offset = Math.max(query.offset, 0);

    const [totalRow] = await this.db.select({ total: count() }).from(moderationActions);

    const rows = await this.db
      .select()
      .from(moderationActions)
      .orderBy(desc(moderationActions.createdAt), desc(moderationActions.id))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map(toActionRow),
      total: Number(totalRow?.total ?? 0),
      offset,
      limit,
    };
  }

  private async record(input: {
    staffId?: string | undefined;
    action: ModerationAction['action'];
    targetType: ModerationAction['targetType'];
    targetId: string;
    reason?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
  }): Promise<void> {
    await this.db.insert(moderationActions).values({
      id: newId(),
      staffId: input.staffId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason ?? null,
      metadata: input.metadata ?? null,
    });
  }
}

export interface ReportRow {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: (typeof reports.$inferSelect)['targetType'];
  targetId: string;
  reason: (typeof reports.$inferSelect)['reason'];
  note: string | null;
  status: (typeof reports.$inferSelect)['status'];
  createdAt: string;
  resolvedAt: string | null;
}

export interface ActionRow {
  id: string;
  staffId: string | null;
  action: ModerationAction['action'];
  targetType: ModerationAction['targetType'];
  targetId: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

function clampPage(limit: number): number {
  return Math.min(Math.max(limit, 1), 100);
}

function toActionRow(row: ModerationAction): ActionRow {
  return {
    id: row.id,
    staffId: row.staffId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    reason: row.reason,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
