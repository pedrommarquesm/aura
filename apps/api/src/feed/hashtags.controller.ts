import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { OptionalAuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AppError } from '../common/errors/app-error';
import { normalizeHashtagQuery } from '../posts/hashtags';

import { DEFAULT_FEED_LIMIT, FeedService, MAX_FEED_LIMIT, type FeedPage } from './feed.service';

const hashtagQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_FEED_LIMIT).default(DEFAULT_FEED_LIMIT),
});

/**
 * Published posts whose caption indexed this tag.
 *
 * Readable without auth, same as the feed. Anonymous callers get
 * `likedByMe: false`.
 */
@Controller('hashtags')
@UseGuards(OptionalAuthGuard)
export class HashtagsController {
  constructor(private readonly feed: FeedService) {}

  @Get(':tag')
  async list(
    @Param('tag') tag: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<FeedPage> {
    const normalized = normalizeHashtagQuery(tag);
    if (!normalized) {
      throw AppError.badRequest('Invalid hashtag');
    }

    const { cursor, limit } = hashtagQuerySchema.parse(query);

    return this.feed.getFeed({
      kind: 'latest',
      cursor,
      limit,
      viewerId: request.user?.id,
      hashtag: normalized,
    });
  }
}
