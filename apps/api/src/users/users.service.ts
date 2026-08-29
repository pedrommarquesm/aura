import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { AppError } from '../common/errors/app-error';
import { DB, type Database } from '../db/db.module';
import { posts, users } from '../db/schema';
import { DEFAULT_FEED_LIMIT, FeedService, MAX_FEED_LIMIT, type FeedPage } from '../feed/feed.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

import { normalizeUsername } from './username';

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
  rank: number;
  postCount: number;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly feed: FeedService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async getByUsername(raw: string): Promise<PublicProfile> {
    const username = normalizeUsername(raw);
    if (username.length < 3) throw AppError.notFound('User not found');

    const [row] = await this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        aura: users.aura,
        title: users.title,
        status: users.status,
      })
      .from(users)
      .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
      .limit(1);

    if (!row || row.status === 'banned') throw AppError.notFound('User not found');

    const [rank, postCount] = await Promise.all([
      this.leaderboard.rankOf(row.id),
      this.countPublished(row.id),
    ]);

    return {
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      aura: row.aura,
      title: row.title,
      rank: rank ?? 0,
      postCount,
    };
  }

  async getPosts(userId: string, query: { cursor?: string; limit: number; viewerId?: string }): Promise<FeedPage> {
    const [author] = await this.db
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!author || author.status === 'banned') throw AppError.notFound('User not found');

    return this.feed.getFeed({
      kind: 'latest',
      cursor: query.cursor,
      limit: query.limit,
      viewerId: query.viewerId,
      authorId: author.id,
    });
  }

  private async countPublished(authorId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(eq(posts.authorId, authorId), eq(posts.status, 'published')));

    return row?.count ?? 0;
  }
}

export { DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT };
