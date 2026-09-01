import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ne, notInArray, or, sql } from 'drizzle-orm';

import { AuraLedgerService } from '../aura/aura-ledger.service';
import { isValidVoteAmount } from '../aura/vote-amount';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { posts, users, votes } from '../db/schema';
import type { User } from '../db/schema';
import { decodeCursor, encodeCursor } from '../feed/cursor';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { SafetyService } from '../safety/safety.service';
import { consumeVoteSlot } from '../safety/vote-rate-limit';
import { REDIS } from '../redis/redis.module';
import type { Redis } from 'ioredis';

import { normalizeReceipt, normalizeRequiredReceipt } from './receipt';

export interface VoteAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
}

/** One row on the receipt ledger. Every vote appears here, with or without text (Q19). */
export interface VoteReceiptRow {
  amount: number;
  receipt: string | null;
  createdAt: string;
  author: VoteAuthor;
}

export interface VoteLedgerPage {
  items: VoteReceiptRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CastVoteResult {
  amount: number;
  receipt: string | null;
  createdAt: string;
  voteCount: number;
  postAura: number;
  creatorAura: number;
  /** True when the caller had already voted — the amount above is the original, unchanged. */
  alreadyVoted: boolean;
}

export interface SetReceiptResult {
  amount: number;
  receipt: string;
  createdAt: string;
}

export const MAX_VOTE_LEDGER_LIMIT = 50;
export const DEFAULT_VOTE_LEDGER_LIMIT = 20;
/** How many of the newest receipts float in-feed (Q6). */
export const OVERLAY_RECEIPT_LIMIT = 5;

@Injectable()
export class VotesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly ledger: AuraLedgerService,
    private readonly leaderboard: LeaderboardService,
    private readonly safety: SafetyService,
  ) {}

  /**
   * Cast a vote.
   *
   * One shot: the composite `(user_id, post_id)` primary key is the
   * idempotency mechanism, same as the old like. A retry or a double-release
   * of the slider returns the vote that already exists rather than casting a
   * second one — there is no "unvote" (docs/redesign-tracker.md Q2/Q3).
   */
  async castVote(
    actor: User,
    postId: string,
    rawAmount: unknown,
    rawReceipt: string | null | undefined,
  ): Promise<CastVoteResult> {
    if (!isValidVoteAmount(rawAmount)) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        'Vote amount must be a nonzero integer between -100 and 100',
        400,
      );
    }
    const amount = rawAmount;
    const receipt = normalizeReceipt(rawReceipt);

    await this.assertVoteBudget(actor.id);

    const post = await this.requirePublishedPost(postId);

    if (post.authorId === actor.id) {
      throw new AppError(
        ErrorCode.CANNOT_VOTE_OWN_POST,
        'You cannot vote on your own post',
        403,
      );
    }

    const inserted = await this.db
      .insert(votes)
      .values({ userId: actor.id, postId, amount, receipt })
      .onConflictDoNothing({ target: [votes.userId, votes.postId] })
      .returning({ createdAt: votes.createdAt });

    if (inserted.length === 0) {
      const existing = await this.db.query.votes.findFirst({
        where: (table, { and: both, eq: equals }) =>
          both(equals(table.userId, actor.id), equals(table.postId, postId)),
      });
      const current = await this.readCounters(postId, post.authorId);

      return {
        amount: existing?.amount ?? amount,
        receipt: existing?.receipt ?? null,
        createdAt: (existing?.createdAt ?? new Date()).toISOString(),
        ...current,
        alreadyVoted: true,
      };
    }

    // A takedown can flip the post to `removed` between the first read and
    // this write. Do not award Aura to a post that is no longer public.
    const stillPublished = await this.db.query.posts.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.id, postId), equals(table.status, 'published')),
    });

    if (!stillPublished) {
      await this.db
        .delete(votes)
        .where(and(eq(votes.userId, actor.id), eq(votes.postId, postId)));
      throw new AppError(ErrorCode.POST_NOT_PUBLISHED, 'This post is not available', 409);
    }

    const event = await this.ledger.apply({
      userId: post.authorId,
      sourceUserId: actor.id,
      postId,
      type: 'VOTE',
      amount,
      idempotencyKey: `vote:${actor.id}:${postId}`,
    });

    const [updated] = await this.db
      .update(posts)
      .set({ voteCount: sql`${posts.voteCount} + 1` })
      .where(eq(posts.id, postId))
      .returning({ voteCount: posts.voteCount });

    await this.db
      .update(votes)
      .set({ auraEventId: event.eventId })
      .where(and(eq(votes.userId, actor.id), eq(votes.postId, postId)));

    await this.leaderboard.applyDelta(post.authorId, amount);

    return {
      amount,
      receipt,
      createdAt: (inserted[0]?.createdAt ?? new Date()).toISOString(),
      voteCount: updated?.voteCount ?? post.voteCount + 1,
      postAura: event.postAura ?? post.aura + amount,
      creatorAura: event.userAura,
      alreadyVoted: false,
    };
  }

  /**
   * Add a receipt to a vote that was cast without one.
   *
   * Once set, a receipt is frozen — this can only ever transition a vote from
   * no-receipt to has-receipt, never edit existing text (Q3).
   */
  async addReceipt(actor: User, postId: string, rawReceipt: string): Promise<SetReceiptResult> {
    const receipt = normalizeRequiredReceipt(rawReceipt);

    const existing = await this.db.query.votes.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.userId, actor.id), equals(table.postId, postId)),
    });

    if (!existing) throw AppError.notFound('You have not voted on this post');

    if (existing.receipt !== null) {
      throw AppError.conflict(ErrorCode.RECEIPT_ALREADY_SET, 'Receipt is already set');
    }

    const [updated] = await this.db
      .update(votes)
      .set({ receipt })
      .where(and(eq(votes.userId, actor.id), eq(votes.postId, postId)))
      .returning({ amount: votes.amount, receipt: votes.receipt, createdAt: votes.createdAt });

    return {
      amount: updated?.amount ?? existing.amount,
      receipt: updated?.receipt ?? receipt,
      createdAt: (updated?.createdAt ?? existing.createdAt).toISOString(),
    };
  }

  /**
   * The receipt ledger. Newest first (Q6). Includes every vote, with or
   * without text — the floating overlay is a client-side filter on top of
   * the same data (or `latestReceipts` below), not a different table.
   */
  async list(
    postId: string,
    query: { cursor?: string | undefined; limit: number; viewerId?: string | undefined },
  ): Promise<VoteLedgerPage> {
    await this.requirePublishedPost(postId);

    const limit = Math.min(Math.max(query.limit, 1), MAX_VOTE_LEDGER_LIMIT);
    const cursor = query.cursor ? decodeCursor(query.cursor, this.env.JWT_SECRET) : undefined;

    const hiddenAuthors = query.viewerId
      ? await this.safety.hiddenAuthorIds(query.viewerId)
      : new Set<string>();

    const filters = [eq(votes.postId, postId), ne(users.status, 'banned')];

    if (hiddenAuthors.size > 0) {
      filters.push(notInArray(votes.userId, [...hiddenAuthors]));
    }

    // Newest first: strictly earlier createdAt, or same createdAt and a
    // strictly "earlier" tiebreak userId, keeps a stable total order.
    const keyset = cursor
      ? or(
          sql`${votes.createdAt} < ${new Date(cursor.value)}`,
          and(eq(votes.createdAt, new Date(cursor.value)), sql`${votes.userId} < ${cursor.id}`),
        )
      : undefined;

    const rows = await this.db
      .select({
        amount: votes.amount,
        receipt: votes.receipt,
        createdAt: votes.createdAt,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        authorAura: users.aura,
        authorTitle: users.title,
      })
      .from(votes)
      .innerJoin(users, eq(users.id, votes.userId))
      .where(keyset ? and(...filters, keyset) : and(...filters))
      .orderBy(desc(votes.createdAt), desc(votes.userId))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor({ value: last.createdAt.getTime(), id: last.authorId }, this.env.JWT_SECRET)
        : null;

    return {
      items: page.map((row) => ({
        amount: row.amount,
        receipt: row.receipt,
        createdAt: row.createdAt.toISOString(),
        author: {
          id: row.authorId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
          aura: row.authorAura,
          title: row.authorTitle,
        },
      })),
      nextCursor,
      hasMore,
    };
  }

  /** The newest receipts that actually have text — what floats in-feed (Q19). */
  async latestReceipts(postId: string, limit = OVERLAY_RECEIPT_LIMIT): Promise<VoteReceiptRow[]> {
    const rows = await this.db
      .select({
        amount: votes.amount,
        receipt: votes.receipt,
        createdAt: votes.createdAt,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        authorAura: users.aura,
        authorTitle: users.title,
      })
      .from(votes)
      .innerJoin(users, eq(users.id, votes.userId))
      .where(and(eq(votes.postId, postId), sql`${votes.receipt} IS NOT NULL`, ne(users.status, 'banned')))
      .orderBy(desc(votes.createdAt), desc(votes.userId))
      .limit(limit);

    return rows.map((row) => ({
      amount: row.amount,
      receipt: row.receipt,
      createdAt: row.createdAt.toISOString(),
      author: {
        id: row.authorId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        aura: row.authorAura,
        title: row.authorTitle,
      },
    }));
  }

  private async assertVoteBudget(userId: string): Promise<void> {
    try {
      const allowed = await consumeVoteSlot(
        this.redis,
        userId,
        this.env.VOTE_RATE_LIMIT_MAX,
        this.env.VOTE_RATE_LIMIT_WINDOW_MS,
      );
      if (!allowed) {
        throw new AppError(ErrorCode.RATE_LIMITED, 'Too many votes. Try again shortly.', 429);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.RATE_LIMITED, 'Too many votes. Try again shortly.', 429);
    }
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
      voteCount: post?.voteCount ?? 0,
      postAura: post?.aura ?? 0,
      creatorAura: author?.aura ?? 0,
    };
  }
}
