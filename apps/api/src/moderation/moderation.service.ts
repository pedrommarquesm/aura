import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { AuraLedgerService } from '../aura/aura-ledger.service';
import { TokensService } from '../auth/tokens.service';
import { AppError } from '../common/errors/app-error';
import { DB, type Database } from '../db/db.module';
import { posts, users, type Post, type User } from '../db/schema';
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
  async setUserStatus(userId: string, status: UserStatus): Promise<StatusChangeResult> {
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
    options: { actorId?: string; reason: 'author_delete' | 'takedown' },
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
}
