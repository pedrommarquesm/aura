import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lt, notInArray, or, sql } from 'drizzle-orm';

import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { likes, mediaAssets, posts, users } from '../db/schema';
import { MediaUrlResolver } from '../media/media-url.resolver';
import { SafetyService } from '../safety/safety.service';

import { decodeCursor, encodeCursor } from './cursor';

export type FeedKind = 'latest' | 'trending';

export interface FeedQuery {
  kind: FeedKind;
  cursor?: string | undefined;
  limit: number;
  viewerId?: string | undefined;
  /** When set, only this author's published posts. Profile grid. */
  authorId?: string | undefined;
}

export interface FeedCard {
  id: string;
  createdAt: string;
  caption: string | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    aura: number;
    title: string | null;
  };
  media: {
    type: 'photo' | 'video';
    width: number | null;
    height: number | null;
    durationMs: number | null;
    thumbUrl: string | null;
    feedUrl: string | null;
    posterUrl: string | null;
    hlsUrl: string | null;
  };
  likeCount: number;
  aura: number;
  likedByMe: boolean;
}

export interface FeedPage {
  items: FeedCard[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const MAX_FEED_LIMIT = 20;
export const DEFAULT_FEED_LIMIT = 10;

@Injectable()
export class FeedService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly mediaUrls: MediaUrlResolver,
    private readonly safety: SafetyService,
  ) {}

  async getFeed(query: FeedQuery): Promise<FeedPage> {
    const limit = Math.min(Math.max(query.limit, 1), MAX_FEED_LIMIT);
    const cursor = query.cursor ? decodeCursor(query.cursor, this.env.JWT_SECRET) : undefined;

    // Fetch one extra row to learn whether another page exists, rather than
    // running a second count query on the hottest read in the product.
    const hiddenAuthors = query.viewerId
      ? await this.safety.hiddenAuthorIds(query.viewerId)
      : new Set<string>();

    const rows = await this.selectPage(query.kind, cursor, limit + 1, {
      authorId: query.authorId,
      hiddenAuthors,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const likedIds = await this.likedPostIds(
      query.viewerId,
      page.map((row) => row.postId),
    );

    const items = page.map((row) => this.toCard(row, likedIds.has(row.postId)));

    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor(
            { value: this.sortValue(query.kind, last), id: last.postId },
            this.env.JWT_SECRET,
          )
        : null;

    return { items, nextCursor, hasMore };
  }

  private sortValue(kind: FeedKind, row: FeedRow): number {
    return kind === 'trending' ? row.trendingScore : (row.publishedAt?.getTime() ?? 0);
  }

  private async selectPage(
    kind: FeedKind,
    cursor: FeedCursorValue,
    limit: number,
    options: { authorId?: string | undefined; hiddenAuthors?: Set<string> } = {},
  ) {
    const filters = [eq(posts.status, 'published')];

    if (options.authorId) {
      filters.push(eq(posts.authorId, options.authorId));
    }

    if (options.hiddenAuthors && options.hiddenAuthors.size > 0) {
      filters.push(notInArray(posts.authorId, [...options.hiddenAuthors]));
    }

    const scope = and(...filters);

    // Keyset pagination on (sortValue, id). Offset pagination would drift as
    // new posts arrive, showing duplicates and skipping items mid-scroll.
    const keyset = cursor
      ? kind === 'trending'
        ? or(
            lt(posts.trendingScore, cursor.value),
            and(eq(posts.trendingScore, cursor.value), lt(posts.id, cursor.id)),
          )
        : or(
            lt(posts.publishedAt, new Date(cursor.value)),
            and(eq(posts.publishedAt, new Date(cursor.value)), lt(posts.id, cursor.id)),
          )
      : undefined;

    const order =
      kind === 'trending'
        ? [desc(posts.trendingScore), desc(posts.id)]
        : [desc(posts.publishedAt), desc(posts.id)];

    return (
      this.db
        .select({
          postId: posts.id,
          caption: posts.caption,
          mediaType: posts.mediaType,
          likeCount: posts.likeCount,
          aura: posts.aura,
          trendingScore: posts.trendingScore,
          publishedAt: posts.publishedAt,
          authorId: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          authorAura: users.aura,
          authorTitle: users.title,
          status: posts.status,
          assetProvider: mediaAssets.storageProvider,
          assetBucket: mediaAssets.storageBucket,
          assetVariants: mediaAssets.variants,
          assetWidth: mediaAssets.width,
          assetHeight: mediaAssets.height,
          assetDurationMs: mediaAssets.durationMs,
        })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.authorId))
        // Left join: a post whose asset row is missing should still render rather
        // than vanish from the feed.
        .leftJoin(mediaAssets, eq(mediaAssets.postId, posts.id))
        .where(keyset ? and(scope, keyset) : scope)
        .orderBy(...order)
        .limit(limit)
    );
  }

  /**
   * Batched `likedByMe`.
   *
   * One query for the whole page. Checking per card would be an N+1 on the
   * most-requested endpoint in the product.
   */
  private async likedPostIds(
    viewerId: string | undefined,
    postIds: string[],
  ): Promise<Set<string>> {
    if (!viewerId || postIds.length === 0) return new Set();

    const rows = await this.db
      .select({ postId: likes.postId })
      .from(likes)
      .where(and(eq(likes.userId, viewerId), inArray(likes.postId, postIds)));

    return new Set(rows.map((row) => row.postId));
  }

  private toCard(row: FeedRow, likedByMe: boolean): FeedCard {
    const variants = row.assetVariants ?? {};
    const location =
      row.assetProvider && row.assetBucket
        ? { provider: row.assetProvider, bucket: row.assetBucket }
        : undefined;

    return {
      id: row.postId,
      createdAt: (row.publishedAt ?? new Date()).toISOString(),
      caption: row.caption,
      author: {
        id: row.authorId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        aura: row.authorAura,
        title: row.authorTitle,
      },
      media: {
        type: row.mediaType,
        width: row.assetWidth,
        height: row.assetHeight,
        durationMs: row.assetDurationMs,
        // URLs are built here from stored keys, never read from a URL column,
        // so changing CDN or storage provider does not touch the data.
        thumbUrl: this.mediaUrls.url(location, variants.thumb),
        feedUrl: this.mediaUrls.url(location, variants.feed),
        posterUrl: this.mediaUrls.url(location, variants.poster),
        hlsUrl: this.mediaUrls.url(location, variants.hls),
      },
      likeCount: row.likeCount,
      aura: row.aura,
      likedByMe,
    };
  }

  /**
   * One post by id. Does not hide unpublished rows — the caller decides
   * whether the viewer is allowed to see a processing upload.
   */
  async getPost(
    postId: string,
    viewerId?: string,
  ): Promise<{ card: FeedCard; authorId: string; status: FeedRow['status'] } | null> {
    const [row] = await this.db
      .select({
        postId: posts.id,
        caption: posts.caption,
        mediaType: posts.mediaType,
        likeCount: posts.likeCount,
        aura: posts.aura,
        trendingScore: posts.trendingScore,
        publishedAt: posts.publishedAt,
        status: posts.status,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        authorAura: users.aura,
        authorTitle: users.title,
        assetProvider: mediaAssets.storageProvider,
        assetBucket: mediaAssets.storageBucket,
        assetVariants: mediaAssets.variants,
        assetWidth: mediaAssets.width,
        assetHeight: mediaAssets.height,
        assetDurationMs: mediaAssets.durationMs,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(mediaAssets, eq(mediaAssets.postId, posts.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (!row) return null;

    const likedIds = await this.likedPostIds(viewerId, [row.postId]);
    return { card: this.toCard(row, likedIds.has(row.postId)), authorId: row.authorId, status: row.status };
  }

  async countPublished(): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(eq(posts.status, 'published'));

    return row?.count ?? 0;
  }
}

type FeedCursorValue = { value: number; id: string } | undefined;
type FeedRow = Awaited<ReturnType<FeedService['selectPage']>>[number];
