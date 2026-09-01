import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';

export interface TrendingRecomputeResult {
  updated: number;
  durationMs: number;
}

/**
 * Recomputes `posts.trending_score`.
 *
 * Runs on the worker, never during a feed read: the trending feed is an
 * ordered index scan over a precomputed column. A recompute lagging by a few
 * seconds is invisible to users, which is exactly why this is allowed to be
 * asynchronous while votes are not.
 *
 * Scoring, per docs/backend-architecture.md §8.2 and docs/redesign-tracker.md
 * `RDX-19`:
 *
 *   velocity   = signed aura gained (or lost) in the recent window / window minutes
 *   recency    = exp(-ageHours / halfLifeHours)
 *   engagement = ln(1 + voteCount)
 *   score      = (velocity + baseline) * recency * (1 + engagement)
 *
 * Velocity is **signed**, not clamped to positive amounts: a pile-on of
 * negative votes should push a post's trending score down (toward "Cooked"),
 * not just make it less trending. `voteCount` only ever grows — engagement
 * still measures "how much judgment has this post received," regardless of
 * direction.
 *
 * Every constant is environment-tunable so the feed can be adjusted without a
 * deploy.
 */
@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async recompute(): Promise<TrendingRecomputeResult> {
    const startedAt = Date.now();

    const windowMinutes = this.env.TRENDING_WINDOW_MINUTES;
    const halfLifeHours = this.env.TRENDING_HALF_LIFE_HOURS;
    const maxAgeHours = this.env.TRENDING_MAX_AGE_HOURS;
    const baseVelocity = this.env.TRENDING_BASE_VELOCITY;
    const maxPosts = this.env.TRENDING_MAX_POSTS;

    // Single statement: candidate selection, velocity aggregation, and the
    // update all happen in one round trip against a consistent snapshot.
    const result = await this.db.execute(sql`
      WITH candidates AS (
        SELECT id, vote_count, published_at
        FROM posts
        WHERE status = 'published'
          AND published_at IS NOT NULL
          AND published_at > now() - make_interval(hours => ${maxAgeHours}::int)
        ORDER BY published_at DESC
        LIMIT ${maxPosts}
      ),
      velocity AS (
        SELECT
          c.id,
          c.vote_count,
          c.published_at,
          COALESCE(SUM(e.amount) FILTER (WHERE e.type = 'VOTE'), 0)::double precision AS aura_in_window
        FROM candidates c
        LEFT JOIN aura_events e
          ON e.post_id = c.id
         AND e.created_at > now() - make_interval(mins => ${windowMinutes}::int)
        GROUP BY c.id, c.vote_count, c.published_at
      ),
      scored AS (
        SELECT
          v.id,
          (
            (v.aura_in_window / ${windowMinutes}::double precision) + ${baseVelocity}::double precision
          )
          * exp(
              -1 * (EXTRACT(EPOCH FROM (now() - v.published_at)) / 3600.0)
              / ${halfLifeHours}::double precision
            )
          * (1 + ln(1 + v.vote_count::double precision)) AS score
        FROM velocity v
      )
      UPDATE posts p
      SET trending_score = s.score
      FROM scored s
      WHERE p.id = s.id
        AND p.trending_score IS DISTINCT FROM s.score
    `);

    const durationMs = Date.now() - startedAt;
    const updated = typeof result.count === 'number' ? result.count : 0;

    this.logger.log(`trending recompute updated ${updated} posts in ${durationMs}ms`);

    return { updated, durationMs };
  }
}
