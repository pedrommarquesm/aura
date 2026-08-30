import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, ne, notInArray, or, sql } from 'drizzle-orm';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { comments, posts, users } from '../db/schema';
import type { User } from '../db/schema';
import { decodeCursor, encodeCursor } from '../feed/cursor';
import { SafetyService } from '../safety/safety.service';

import { normalizeCommentBody } from './body';

export interface CommentAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
}

export interface CommentCard {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface CommentPage {
  items: CommentCard[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateCommentResult {
  comment: CommentCard;
  commentCount: number;
}

export const MAX_COMMENT_LIMIT = 50;
export const DEFAULT_COMMENT_LIMIT = 20;

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly safety: SafetyService,
  ) {}

  /**
   * Anyone signed in can comment, including the post author. Comments do not
   * award Aura — likes remain the only V0 score event.
   */
  async create(actor: User, postId: string, rawBody: string): Promise<CreateCommentResult> {
    const body = normalizeCommentBody(rawBody);
    await this.requirePublishedPost(postId);

    const created = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(comments)
        .values({ postId, authorId: actor.id, body })
        .returning();

      if (!row) throw new AppError(ErrorCode.INTERNAL, 'Could not create comment', 500);

      const [updated] = await tx
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} + 1` })
        .where(eq(posts.id, postId))
        .returning({ commentCount: posts.commentCount });

      return { row, commentCount: updated?.commentCount ?? 1 };
    });

    return {
      comment: {
        id: created.row.id,
        body: created.row.body,
        createdAt: created.row.createdAt.toISOString(),
        author: {
          id: actor.id,
          username: actor.username,
          displayName: actor.displayName,
          avatarUrl: actor.avatarUrl,
          aura: actor.aura,
          title: actor.title,
        },
      },
      commentCount: created.commentCount,
    };
  }

  async list(
    postId: string,
    query: { cursor?: string | undefined; limit: number; viewerId?: string | undefined },
  ): Promise<CommentPage> {
    await this.requirePublishedPost(postId);

    const limit = Math.min(Math.max(query.limit, 1), MAX_COMMENT_LIMIT);
    const cursor = query.cursor ? decodeCursor(query.cursor, this.env.JWT_SECRET) : undefined;

    const hiddenAuthors = query.viewerId
      ? await this.safety.hiddenAuthorIds(query.viewerId)
      : new Set<string>();

    const filters = [eq(comments.postId, postId), ne(users.status, 'banned')];

    if (hiddenAuthors.size > 0) {
      filters.push(notInArray(comments.authorId, [...hiddenAuthors]));
    }

    const keyset = cursor
      ? or(
          gt(comments.createdAt, new Date(cursor.value)),
          and(eq(comments.createdAt, new Date(cursor.value)), gt(comments.id, cursor.id)),
        )
      : undefined;

    const rows = await this.db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        authorId: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        authorAura: users.aura,
        authorTitle: users.title,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(keyset ? and(...filters, keyset) : and(...filters))
      .orderBy(asc(comments.createdAt), asc(comments.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor({ value: last.createdAt.getTime(), id: last.id }, this.env.JWT_SECRET)
        : null;

    return {
      items: page.map((row) => ({
        id: row.id,
        body: row.body,
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
}
