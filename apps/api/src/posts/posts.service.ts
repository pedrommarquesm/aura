import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { AppError } from '../common/errors/app-error';
import { DB, type Database } from '../db/db.module';
import { posts } from '../db/schema';
import { FeedService, type FeedCard } from '../feed/feed.service';

import { normalizeCaption } from './caption';

export type UpdateCaptionResult = FeedCard & {
  status: 'uploading' | 'processing' | 'published' | 'failed' | 'removed';
};

@Injectable()
export class PostsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly feed: FeedService,
  ) {}

  /**
   * Author-only caption edit. Media stays as it is — the product only lets
   * you change the description after publish.
   */
  async updateCaption(actorId: string, postId: string, caption: string | null): Promise<UpdateCaptionResult> {
    const post = await this.db.query.posts.findFirst({
      where: (table, { eq: equals }) => equals(table.id, postId),
    });

    if (!post || post.status === 'removed') {
      throw AppError.notFound('Post not found');
    }

    if (post.authorId !== actorId) {
      throw AppError.forbidden('You can only edit your own post');
    }

    await this.db
      .update(posts)
      .set({ caption: normalizeCaption(caption) })
      .where(eq(posts.id, postId));

    const found = await this.feed.getPost(postId, actorId);
    if (!found) throw AppError.notFound('Post not found');

    return { ...found.card, status: found.status };
  }
}
