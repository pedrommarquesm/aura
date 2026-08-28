import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { newId } from '../common/ids';
import { DB, type Database } from '../db/db.module';
import { auraEvents, posts, users } from '../db/schema';

export type AuraEventType =
  'LIKE' | 'SUPER_LIKE' | 'BATTLE_WIN' | 'CHALLENGE' | 'VOTER_REWARD' | 'BONUS' | 'REVERSAL';

export interface ApplyAuraInput {
  /** Who receives the Aura. */
  userId: string;
  /** Who caused it. Null for system grants. */
  sourceUserId?: string | null;
  postId?: string | null;
  type: AuraEventType;
  /** Signed integer. Negative for REVERSAL. Never fractional. */
  amount: number;
  metadata?: Record<string, unknown>;
  /** Makes a retried write safe. */
  idempotencyKey?: string;
}

export interface AuraEventResult {
  eventId: string;
  userAura: number;
  postAura: number | null;
  /** True when an existing event was returned instead of a new one. */
  deduplicated: boolean;
}

/**
 * The single writer for Aura.
 *
 * Every movement of Aura is an `aura_events` row written in the same
 * transaction as the counter updates on `users` and `posts`. **No other code
 * may touch `users.aura` or `posts.aura`.** That rule is what makes auditing,
 * fraud investigation, reversals, and recomputing Vote Power against history
 * possible at all.
 *
 * See docs/backend-architecture.md §7.
 */
@Injectable()
export class AuraLedgerService {
  private readonly logger = new Logger(AuraLedgerService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async apply(input: ApplyAuraInput): Promise<AuraEventResult> {
    if (!Number.isInteger(input.amount)) {
      // Guard rather than round: a fractional amount means a caller computed a
      // multiplier wrong, and silently rounding it would corrupt the ledger in
      // a way that is invisible until the totals stop reconciling.
      throw new Error(`Aura amount must be an integer, received ${input.amount}`);
    }

    if (input.amount === 0) {
      throw new Error('Refusing to write a zero-amount Aura event');
    }

    return this.db.transaction(async (tx) => {
      const eventId = newId();

      const inserted = await tx
        .insert(auraEvents)
        .values({
          id: eventId,
          userId: input.userId,
          sourceUserId: input.sourceUserId ?? null,
          postId: input.postId ?? null,
          type: input.type,
          amount: input.amount,
          metadata: input.metadata ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
        })
        .onConflictDoNothing({ target: auraEvents.idempotencyKey })
        .returning({ id: auraEvents.id });

      if (inserted.length === 0) {
        // The unique index on idempotency_key rejected this write, so the
        // event already exists. Return the current totals without applying the
        // amount a second time.
        const existing = await tx.query.auraEvents.findFirst({
          where: (table, { eq: equals }) =>
            equals(table.idempotencyKey, input.idempotencyKey ?? ''),
        });

        const [user] = await tx
          .select({ aura: users.aura })
          .from(users)
          .where(eq(users.id, input.userId));

        return {
          eventId: existing?.id ?? '',
          userAura: user?.aura ?? 0,
          postAura: null,
          deduplicated: true,
        };
      }

      const [user] = await tx
        .update(users)
        .set({ aura: sql`${users.aura} + ${input.amount}`, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning({ aura: users.aura });

      let postAura: number | null = null;

      if (input.postId) {
        const [post] = await tx
          .update(posts)
          .set({ aura: sql`${posts.aura} + ${input.amount}` })
          .where(eq(posts.id, input.postId))
          .returning({ aura: posts.aura });

        postAura = post?.aura ?? null;
      }

      return {
        eventId,
        userAura: user?.aura ?? 0,
        postAura,
        deduplicated: false,
      };
    });
  }

  /**
   * Rebuilds the denormalized counters from the ledger.
   *
   * `users.aura` and `posts.aura` are materialized sums, so they can drift —
   * a partial failure, a bad migration, a bug in a future writer. The ledger is
   * the source of truth, and this recomputes both from it.
   *
   * Worth having even while it is rarely run: the day the totals look wrong is
   * a bad day to start writing the tool that fixes them.
   */
  async reconcile(): Promise<{ usersUpdated: number; postsUpdated: number }> {
    const userResult = await this.db.execute(sql`
      UPDATE users u
      SET aura = COALESCE(totals.sum, 0)
      FROM (
        SELECT ${users.id} AS id,
               (SELECT COALESCE(SUM(e.amount), 0)
                FROM aura_events e
                WHERE e.user_id = ${users.id}) AS sum
        FROM users
      ) AS totals
      WHERE u.id = totals.id AND u.aura IS DISTINCT FROM COALESCE(totals.sum, 0)
    `);

    const postResult = await this.db.execute(sql`
      UPDATE posts p
      SET aura = COALESCE(totals.sum, 0)
      FROM (
        SELECT ${posts.id} AS id,
               (SELECT COALESCE(SUM(e.amount), 0)
                FROM aura_events e
                WHERE e.post_id = ${posts.id}) AS sum
        FROM posts
      ) AS totals
      WHERE p.id = totals.id AND p.aura IS DISTINCT FROM COALESCE(totals.sum, 0)
    `);

    const usersUpdated = typeof userResult.count === 'number' ? userResult.count : 0;
    const postsUpdated = typeof postResult.count === 'number' ? postResult.count : 0;

    if (usersUpdated > 0 || postsUpdated > 0) {
      this.logger.warn(`reconciliation corrected ${usersUpdated} users and ${postsUpdated} posts`);
    }

    return { usersUpdated, postsUpdated };
  }
}
