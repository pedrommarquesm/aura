import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';

import { DB, type Database } from '../db/db.module';
import { users } from '../db/schema';
import { REDIS } from '../redis/redis.module';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  viewer: LeaderboardEntry | null;
  total: number;
}

const GLOBAL_KEY = 'lb:global';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * Top N plus the viewer's own rank.
   *
   * Redis sorted sets answer "where am I" in O(log n), which is the whole
   * point: the product needs to show `#47` to someone outside the top 100, and
   * computing that in SQL means counting rows above them on every profile
   * render.
   *
   * Postgres stays the source of truth. If Redis is cold or unavailable the
   * board falls back to SQL rather than failing — a degraded leaderboard is
   * much better than a broken screen.
   */
  async global(viewerId: string | undefined, limit = 100): Promise<LeaderboardPage> {
    try {
      const cached = await this.fromRedis(viewerId, limit);
      if (cached) return cached;
    } catch (error) {
      this.logger.warn(
        `leaderboard falling back to SQL: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return this.fromDatabase(viewerId, limit);
  }

  private async fromRedis(
    viewerId: string | undefined,
    limit: number,
  ): Promise<LeaderboardPage | null> {
    const total = await this.redis.zcard(GLOBAL_KEY);
    if (total === 0) return null;

    const raw = await this.redis.zrevrange(GLOBAL_KEY, 0, limit - 1, 'WITHSCORES');
    const ids: string[] = [];
    const scores = new Map<string, number>();

    for (let i = 0; i < raw.length; i += 2) {
      const id = raw[i]!;
      ids.push(id);
      scores.set(id, Number(raw[i + 1]));
    }

    const profiles = await this.profiles(ids);

    const entries = ids
      .map((id, index) => {
        const profile = profiles.get(id);
        if (!profile) return null;

        return { ...profile, rank: index + 1, aura: scores.get(id) ?? profile.aura };
      })
      .filter((entry): entry is LeaderboardEntry => entry !== null);

    let viewer: LeaderboardEntry | null = null;

    if (viewerId) {
      const inTop = entries.find((entry) => entry.userId === viewerId);

      if (inTop) {
        viewer = inTop;
      } else {
        const rank = await this.redis.zrevrank(GLOBAL_KEY, viewerId);
        const score = await this.redis.zscore(GLOBAL_KEY, viewerId);

        if (rank !== null) {
          const profile = (await this.profiles([viewerId])).get(viewerId);
          if (profile) {
            viewer = { ...profile, rank: rank + 1, aura: Number(score ?? profile.aura) };
          }
        }
      }
    }

    return { entries, viewer, total };
  }

  private async fromDatabase(
    viewerId: string | undefined,
    limit: number,
  ): Promise<LeaderboardPage> {
    const rows = await this.db
      .select({
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        aura: users.aura,
        title: users.title,
      })
      .from(users)
      .orderBy(desc(users.aura), users.id)
      .limit(limit);

    const entries = rows.map((row, index) => ({ ...row, rank: index + 1 }));

    const [countRow] = await this.db.select({ count: sql<number>`count(*)::int` }).from(users);
    const total = countRow?.count ?? entries.length;

    let viewer: LeaderboardEntry | null = entries.find((e) => e.userId === viewerId) ?? null;

    if (viewerId && !viewer) {
      const [row] = await this.db.execute<{
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        aura: number;
        title: string | null;
        rank: number;
      }>(sql`
        SELECT id, username, display_name, avatar_url, aura, title,
               (SELECT count(*) + 1 FROM users higher WHERE higher.aura > u.aura)::int AS rank
        FROM users u
        WHERE u.id = ${viewerId}
      `);

      if (row) {
        viewer = {
          rank: row.rank,
          userId: row.id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
          aura: row.aura,
          title: row.title,
        };
      }
    }

    return { entries, viewer, total };
  }

  private async profiles(ids: string[]): Promise<Map<string, Omit<LeaderboardEntry, 'rank'>>> {
    if (ids.length === 0) return new Map();

    const rows = await this.db
      .select({
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        aura: users.aura,
        title: users.title,
      })
      .from(users)
      .where(sql`${users.id} = ANY(${sql.raw(`ARRAY['${ids.join("','")}']`)})`);

    return new Map(rows.map((row) => [row.userId, row]));
  }

  /**
   * One user's global rank. Used by the public profile card so we do not have
   * to load the whole board to say "#47".
   */
  async rankOf(userId: string): Promise<number | null> {
    try {
      const rank = await this.redis.zrevrank(GLOBAL_KEY, userId);
      if (rank !== null) return rank + 1;
    } catch (error) {
      this.logger.warn(
        `rankOf falling back to SQL: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    const [row] = await this.db.execute<{ rank: number }>(sql`
      SELECT (SELECT count(*) + 1 FROM users higher WHERE higher.aura > u.aura)::int AS rank
      FROM users u
      WHERE u.id = ${userId}
    `);

    return row?.rank ?? null;
  }

  /** Rebuilds the sorted set from Postgres. Redis is a projection, not truth. */
  async rebuild(): Promise<number> {
    const rows = await this.db.select({ id: users.id, aura: users.aura }).from(users);
    if (rows.length === 0) return 0;

    const pipeline = this.redis.pipeline();
    pipeline.del(GLOBAL_KEY);

    for (const row of rows) {
      pipeline.zadd(GLOBAL_KEY, row.aura, row.id);
    }

    await pipeline.exec();
    return rows.length;
  }

  async applyDelta(userId: string, delta: number): Promise<void> {
    try {
      await this.redis.zincrby(GLOBAL_KEY, delta, userId);
    } catch (error) {
      // Ranking must never fail a like. The periodic rebuild repairs drift.
      this.logger.warn(
        `leaderboard delta dropped for ${userId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
