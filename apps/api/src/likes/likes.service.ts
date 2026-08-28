import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { AuraLedgerService } from '../aura/aura-ledger.service';
import { auraForLike } from '../aura/vote-power';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { DB, type Database } from '../db/db.module';
import { likes, posts } from '../db/schema';
import type { User } from '../db/schema';

export interface LikeResult {
  liked: boolean;
  likeCount: number;
  postAura: number;
  creatorAura: number;
  /** Aura the actor gained. Always 0 in V0; voter rewards are a V1 job. */
  actorAuraDelta: number;
}

@Injectable()
export class LikesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly ledger: AuraLedgerService,
  ) {}

  /**
   * Like a post.
   *
   * Idempotent by construction: the `(user_id, post_id)` primary key rejects
   * the second insert, so a double tap or a retry over a flaky mobile network
   * cannot award Aura twice. A repeat is a success, not an error — the client
   * already showed the like optimistically and must not roll it back.
   */
  async like(actor: User, postId: string): Promise<LikeResult> {
    const post = await this.requirePublishedPost(postId);

    if (post.authorId === actor.id) {
      throw new AppError(
        ErrorCode.CANNOT_LIKE_OWN_POST,
        'You cannot award Aura to your own post',
        403,
      );
    }

    const inserted = await this.db
      .insert(likes)
      .values({ userId: actor.id, postId, kind: 'like' })
      .onConflictDoNothing()
      .returning({ postId: likes.postId });

    if (inserted.length === 0) {
      const current = await this.readCounters(postId, post.authorId);
      return { ...current, liked: true, actorAuraDelta: 0 };
    }

    const amount = auraForLike(actor);

    const event = await this.ledger.apply({
      userId: post.authorId,
      sourceUserId: actor.id,
      postId,
      type: 'LIKE',
      amount,
      // Ties the ledger row to this exact like, so an unlike reverses the
      // amount that was actually awarded rather than what a like is worth now.
      idempotencyKey: `like:${actor.id}:${postId}`,
    });

    const [updated] = await this.db
      .update(posts)
      .set({ likeCount: sql`${posts.likeCount} + 1` })
      .where(eq(posts.id, postId))
      .returning({ likeCount: posts.likeCount });

    await this.db
      .update(likes)
      .set({ auraEventId: event.eventId })
      .where(and(eq(likes.userId, actor.id), eq(likes.postId, postId)));

    return {
      liked: true,
      likeCount: updated?.likeCount ?? post.likeCount + 1,
      postAura: event.postAura ?? post.aura + amount,
      creatorAura: event.userAura,
      actorAuraDelta: 0,
    };
  }

  async unlike(actor: User, postId: string): Promise<LikeResult> {
    const post = await this.requirePublishedPost(postId);

    const existing = await this.db.query.likes.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.userId, actor.id), equals(table.postId, postId)),
    });

    if (!existing) {
      const current = await this.readCounters(postId, post.authorId);
      return { ...current, liked: false, actorAuraDelta: 0 };
    }

    // Reverse exactly what was awarded. Recomputing the value here would drift
    // the moment Vote Power makes a like's worth change over time.
    const originalAmount = await this.originalAmount(existing.auraEventId);

    await this.db.delete(likes).where(and(eq(likes.userId, actor.id), eq(likes.postId, postId)));

    const event = await this.ledger.apply({
      userId: post.authorId,
      sourceUserId: actor.id,
      postId,
      type: 'REVERSAL',
      amount: -originalAmount,
      metadata: { reason: 'unlike', reversesEventId: existing.auraEventId },
      idempotencyKey: `unlike:${actor.id}:${postId}:${existing.auraEventId ?? 'unknown'}`,
    });

    const [updated] = await this.db
      .update(posts)
      // Clamp at zero: a counter that can go negative turns one bad reversal
      // into a permanently wrong number on the card.
      .set({ likeCount: sql`GREATEST(${posts.likeCount} - 1, 0)` })
      .where(eq(posts.id, postId))
      .returning({ likeCount: posts.likeCount });

    return {
      liked: false,
      likeCount: updated?.likeCount ?? Math.max(post.likeCount - 1, 0),
      postAura: event.postAura ?? post.aura - originalAmount,
      creatorAura: event.userAura,
      actorAuraDelta: 0,
    };
  }

  private async originalAmount(auraEventId: string | null): Promise<number> {
    if (!auraEventId) return auraForLike({ id: '', aura: 0, votePower: '1' });

    const event = await this.db.query.auraEvents.findFirst({
      where: (table, { eq: equals }) => equals(table.id, auraEventId),
    });

    return event?.amount ?? auraForLike({ id: '', aura: 0, votePower: '1' });
  }

  private async requirePublishedPost(postId: string) {
    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, postId),
    });

    if (!post) throw AppError.notFound('Post not found');

    if (post.status !== 'published') {
      throw new AppError(ErrorCode.POST_NOT_PUBLISHED, 'This post is not available', 409);
    }

    return post;
  }

  private async readCounters(postId: string, authorId: string) {
    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, postId),
    });

    const author = await this.db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, authorId),
    });

    return {
      likeCount: post?.likeCount ?? 0,
      postAura: post?.aura ?? 0,
      creatorAura: author?.aura ?? 0,
    };
  }
}
