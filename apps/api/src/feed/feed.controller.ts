import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { OptionalAuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

import { DEFAULT_FEED_LIMIT, FeedService, MAX_FEED_LIMIT, type FeedPage } from './feed.service';

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_FEED_LIMIT).default(DEFAULT_FEED_LIMIT),
});

/**
 * The feed is readable without authentication.
 *
 * A new install scrolls immediately and only meets an auth prompt on its first
 * Aura action, which converts far better than a cold signup wall. Anonymous
 * callers simply get `likedByMe: false` throughout.
 */
@Controller('feed')
@UseGuards(OptionalAuthGuard)
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  @Get()
  async latest(@Query() query: unknown, @Req() request: AuthenticatedRequest): Promise<FeedPage> {
    const { cursor, limit } = feedQuerySchema.parse(query);

    return this.feed.getFeed({ kind: 'latest', cursor, limit, viewerId: request.user?.id });
  }

  @Get('trending')
  async trending(@Query() query: unknown, @Req() request: AuthenticatedRequest): Promise<FeedPage> {
    const { cursor, limit } = feedQuerySchema.parse(query);

    return this.feed.getFeed({ kind: 'trending', cursor, limit, viewerId: request.user?.id });
  }
}
