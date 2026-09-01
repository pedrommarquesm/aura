import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { AppError } from '../common/errors/app-error';
import { DB, type Database } from '../db/db.module';
import { authIdentities, mediaAssets, posts, reports, staff, users, votes } from '../db/schema';
import { MediaUrlResolver } from '../media/media-url.resolver';

export const ADMIN_PAGE_SIZE = 25;
export const ADMIN_MAX_PAGE_SIZE = 100;

export interface AdminStats {
  users: { total: number; active: number; suspended: number; banned: number; createdLast7Days: number };
  posts: { published: number; removed: number; createdLast7Days: number };
  votes: { total: number; last7Days: number };
  reports: { open: number; dismissed: number; actioned: number };
  staff: { total: number; active: number };
}

export interface AdminUserRow {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  status: (typeof users.$inferSelect)['status'];
  aura: number;
  postCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  country: string | null;
  city: string | null;
  locale: string;
  title: string | null;
  identities: { provider: string; email: string | null; lastLoginAt: string | null }[];
}

export interface AdminPostRow {
  id: string;
  caption: string | null;
  status: (typeof posts.$inferSelect)['status'];
  mediaType: (typeof posts.$inferSelect)['mediaType'];
  voteCount: number;
  aura: number;
  createdAt: string;
  publishedAt: string | null;
  thumbUrl: string | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: (typeof users.$inferSelect)['status'];
  };
}

export interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly mediaUrls: MediaUrlResolver,
  ) {}

  async stats(): Promise<AdminStats> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [userStats, postStats, voteStats, reportStats, staffStats] = await Promise.all([
      this.db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${users.status} = 'active')`.mapWith(Number),
          suspended: sql<number>`count(*) filter (where ${users.status} = 'suspended')`.mapWith(
            Number,
          ),
          banned: sql<number>`count(*) filter (where ${users.status} = 'banned')`.mapWith(Number),
          createdLast7Days: sql<number>`count(*) filter (where ${users.createdAt} >= ${since})`.mapWith(
            Number,
          ),
        })
        .from(users),
      this.db
        .select({
          published: sql<number>`count(*) filter (where ${posts.status} = 'published')`.mapWith(
            Number,
          ),
          removed: sql<number>`count(*) filter (where ${posts.status} = 'removed')`.mapWith(Number),
          createdLast7Days: sql<number>`count(*) filter (where ${posts.createdAt} >= ${since})`.mapWith(
            Number,
          ),
        })
        .from(posts),
      this.db
        .select({
          total: count(),
          last7Days: sql<number>`count(*) filter (where ${votes.createdAt} >= ${since})`.mapWith(
            Number,
          ),
        })
        .from(votes),
      this.db
        .select({
          open: sql<number>`count(*) filter (where ${reports.status} = 'open')`.mapWith(Number),
          dismissed: sql<number>`count(*) filter (where ${reports.status} = 'dismissed')`.mapWith(
            Number,
          ),
          actioned: sql<number>`count(*) filter (where ${reports.status} = 'actioned')`.mapWith(
            Number,
          ),
        })
        .from(reports),
      this.db
        .select({
          total: count(),
          active: sql<number>`count(*) filter (where ${staff.status} = 'active')`.mapWith(Number),
        })
        .from(staff),
    ]);

    return {
      users: {
        total: Number(userStats[0]?.total ?? 0),
        active: userStats[0]?.active ?? 0,
        suspended: userStats[0]?.suspended ?? 0,
        banned: userStats[0]?.banned ?? 0,
        createdLast7Days: userStats[0]?.createdLast7Days ?? 0,
      },
      posts: {
        published: postStats[0]?.published ?? 0,
        removed: postStats[0]?.removed ?? 0,
        createdLast7Days: postStats[0]?.createdLast7Days ?? 0,
      },
      votes: {
        total: Number(voteStats[0]?.total ?? 0),
        last7Days: voteStats[0]?.last7Days ?? 0,
      },
      reports: {
        open: reportStats[0]?.open ?? 0,
        dismissed: reportStats[0]?.dismissed ?? 0,
        actioned: reportStats[0]?.actioned ?? 0,
      },
      staff: {
        total: Number(staffStats[0]?.total ?? 0),
        active: staffStats[0]?.active ?? 0,
      },
    };
  }

  async listUsers(query: {
    q?: string;
    status?: (typeof users.$inferSelect)['status'];
    offset: number;
    limit: number;
  }): Promise<Page<AdminUserRow>> {
    const limit = clampLimit(query.limit);
    const offset = Math.max(query.offset, 0);
    const filters = this.userFilters(query.q, query.status);

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(users)
      .where(where);

    const rows = await this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        status: users.status,
        aura: users.aura,
        createdAt: users.createdAt,
        email: sql<string | null>`(
          select ${authIdentities.emailAtSignup}
          from ${authIdentities}
          where ${authIdentities.userId} = ${users.id}
          order by ${authIdentities.lastLoginAt} desc nulls last
          limit 1
        )`,
        lastLoginAt: sql<Date | null>`(
          select max(${authIdentities.lastLoginAt})
          from ${authIdentities}
          where ${authIdentities.userId} = ${users.id}
        )`,
        postCount: sql<number>`(
          select count(*) from ${posts}
          where ${posts.authorId} = ${users.id} and ${posts.status} = 'published'
        )`.mapWith(Number),
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((row) => ({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        email: row.email,
        status: row.status,
        aura: row.aura,
        postCount: row.postCount,
        createdAt: row.createdAt.toISOString(),
        lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt).toISOString() : null,
      })),
      total: Number(totalRow?.total ?? 0),
      offset,
      limit,
    };
  }

  async getUser(userId: string): Promise<AdminUserDetail> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) throw AppError.notFound('User not found');

    const [identities, [countRow]] = await Promise.all([
      this.db
        .select({
          provider: authIdentities.provider,
          email: authIdentities.emailAtSignup,
          lastLoginAt: authIdentities.lastLoginAt,
        })
        .from(authIdentities)
        .where(eq(authIdentities.userId, userId)),
      this.db
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.authorId, userId), eq(posts.status, 'published'))),
    ]);

    const lastLogin = identities.reduce<Date | null>((latest, identity) => {
      if (!identity.lastLoginAt) return latest;
      if (!latest || identity.lastLoginAt > latest) return identity.lastLoginAt;
      return latest;
    }, null);

    return {
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      email: identities.find((identity) => identity.email)?.email ?? null,
      status: row.status,
      aura: row.aura,
      postCount: Number(countRow?.total ?? 0),
      createdAt: row.createdAt.toISOString(),
      lastLoginAt: lastLogin ? lastLogin.toISOString() : null,
      country: row.country,
      city: row.city,
      locale: row.locale,
      title: row.title,
      identities: identities.map((identity) => ({
        provider: identity.provider,
        email: identity.email,
        lastLoginAt: identity.lastLoginAt ? identity.lastLoginAt.toISOString() : null,
      })),
    };
  }

  async listUserPosts(
    userId: string,
    query: { offset: number; limit: number },
  ): Promise<Page<AdminPostRow>> {
    const [author] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!author) throw AppError.notFound('User not found');

    return this.listPosts({ ...query, authorId: userId });
  }

  async listPosts(query: {
    q?: string;
    status?: (typeof posts.$inferSelect)['status'];
    authorId?: string;
    offset: number;
    limit: number;
  }): Promise<Page<AdminPostRow>> {
    const limit = clampLimit(query.limit);
    const offset = Math.max(query.offset, 0);
    const filters: SQL[] = [];

    if (query.status) filters.push(eq(posts.status, query.status));
    if (query.authorId) filters.push(eq(posts.authorId, query.authorId));
    if (query.q?.trim()) {
      const term = `%${query.q.trim()}%`;
      const match = or(ilike(posts.caption, term), ilike(users.username, term));
      if (match) filters.push(match);
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(where);

    const rows = await this.db
      .select({
        id: posts.id,
        caption: posts.caption,
        status: posts.status,
        mediaType: posts.mediaType,
        voteCount: posts.voteCount,
        aura: posts.aura,
        createdAt: posts.createdAt,
        publishedAt: posts.publishedAt,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        authorStatus: users.status,
        assetProvider: mediaAssets.storageProvider,
        assetBucket: mediaAssets.storageBucket,
        assetVariants: mediaAssets.variants,
        assetExternalProvider: mediaAssets.externalProvider,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(mediaAssets, eq(mediaAssets.postId, posts.id))
      .where(where)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((row) => {
        const variants = row.assetVariants ?? {};
        const location =
          row.assetProvider && row.assetBucket
            ? { provider: row.assetProvider, bucket: row.assetBucket }
            : undefined;

        return {
          id: row.id,
          caption: row.caption,
          status: row.status,
          mediaType: row.mediaType,
          voteCount: row.voteCount,
          aura: row.aura,
          createdAt: row.createdAt.toISOString(),
          publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
          thumbUrl: this.mediaUrls.card({
            location,
            variants,
            externalProvider: row.assetExternalProvider,
          }).thumbUrl,
          author: {
            id: row.authorId,
            username: row.username,
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
            status: row.authorStatus,
          },
        };
      }),
      total: Number(totalRow?.total ?? 0),
      offset,
      limit,
    };
  }

  private userFilters(
    q: string | undefined,
    status: (typeof users.$inferSelect)['status'] | undefined,
  ): SQL[] {
    const filters: SQL[] = [];

    if (status) filters.push(eq(users.status, status));

    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      const match = or(
        ilike(users.username, term),
        ilike(users.displayName, term),
        sql`exists (
          select 1 from ${authIdentities}
          where ${authIdentities.userId} = ${users.id}
            and ${authIdentities.emailAtSignup} ilike ${term}
        )`,
      );
      if (match) filters.push(match);
    }

    return filters;
  }
}

function clampLimit(limit: number): number {
  return Math.min(Math.max(limit, 1), ADMIN_MAX_PAGE_SIZE);
}
