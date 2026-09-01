import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lt, ne, notInArray, or, sql } from 'drizzle-orm';

import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { mediaAssets, postHashtags, posts, users, votes } from '../db/schema';
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
  /** When set, only posts whose caption indexed this lowercase tag. */
  hashtag?: string | undefined;
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
  voteCount: number;
  /** Signed. This post may be in Aura Debt (negative). */
  aura: number;
  votedByMe: boolean;
  /** The viewer's own vote amount, if they cast one. There is no unvote. */
  myAmount: number | null;
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
      hashtag: query.hashtag,
      hiddenAuthors,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const myVotes = await this.myVotes(
      query.viewerId,
      page.map((row) => row.postId),
    );

    const items = page.map((row) => this.toCard(row, myVotes.get(row.postId)));

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
    options: {
      authorId?: string | undefined;
      hashtag?: string | undefined;
      hiddenAuthors?: Set<string>;
    } = {},
  ) {
    // Published only. Banned authors leave the public surface. Suspended
    // accounts keep their existing posts (they just cannot act). Blocks are
    // hidden in both directions when the viewer is signed in.
    const filters = [eq(posts.status, 'published'), ne(users.status, 'banned')];

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

    const base = this.db
      .select({
        postId: posts.id,
        caption: posts.caption,
        mediaType: posts.mediaType,
        voteCount: posts.voteCount,
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
        assetExternalProvider: mediaAssets.externalProvider,
        assetWidth: mediaAssets.width,
        assetHeight: mediaAssets.height,
        assetDurationMs: mediaAssets.durationMs,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      // Left join: a post whose asset row is missing should still render rather
      // than vanish from the feed.
      .leftJoin(mediaAssets, eq(mediaAssets.postId, posts.id));

    const scoped = options.hashtag
      ? base.innerJoin(
          postHashtags,
          and(eq(postHashtags.postId, posts.id), eq(postHashtags.tag, options.hashtag)),
        )
      : base;

    return scoped
      .where(keyset ? and(scope, keyset) : scope)
      .orderBy(...order)
      .limit(limit);
  }

  /**
   * Batched `votedByMe` / `myAmount`.
   *
   * One query for the whole page. Checking per card would be an N+1 on the
   * most-requested endpoint in the product.
   */
  private async myVotes(
    viewerId: string | undefined,
    postIds: string[],
  ): Promise<Map<string, number>> {
    if (!viewerId || postIds.length === 0) return new Map();

    const rows = await this.db
      .select({ postId: votes.postId, amount: votes.amount })
      .from(votes)
      .where(and(eq(votes.userId, viewerId), inArray(votes.postId, postIds)));

    return new Map(rows.map((row) => [row.postId, row.amount]));
  }

  private toCard(row: FeedRow, myAmount: number | undefined): FeedCard {
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
        // Coordinates, not URLs. Mux playback ids resolve to stream.mux.com.
        ...this.mediaUrls.card({
          location,
          variants,
          externalProvider: row.assetExternalProvider,
        }),
      },
      voteCount: row.voteCount,
      aura: row.aura,
      votedByMe: myAmount !== undefined,
      myAmount: myAmount ?? null,
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
        voteCount: posts.voteCount,
        aura: posts.aura,
        trendingScore: posts.trendingScore,
        publishedAt: posts.publishedAt,
        status: posts.status,
        authorStatus: users.status,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        authorAura: users.aura,
        authorTitle: users.title,
        assetProvider: mediaAssets.storageProvider,
        assetBucket: mediaAssets.storageBucket,
        assetVariants: mediaAssets.variants,
        assetExternalProvider: mediaAssets.externalProvider,
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
    if (row.authorStatus === 'banned') return null;

    const myVotes = await this.myVotes(viewerId, [row.postId]);
    return { card: this.toCard(row, myVotes.get(row.postId)), authorId: row.authorId, status: row.status };
  }

  async countPublished(): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .where(and(eq(posts.status, 'published'), ne(users.status, 'banned')));

    return row?.count ?? 0;
  }
}

type FeedCursorValue = { value: number; id: string } | undefined;
type FeedRow = Awaited<ReturnType<FeedService['selectPage']>>[number];
