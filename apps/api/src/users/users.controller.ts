import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { OptionalAuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT, type FeedPage } from '../feed/feed.service';

import { UsersService, type PublicProfile } from './users.service';

const postsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_FEED_LIMIT).default(DEFAULT_FEED_LIMIT),
});

@Controller('users')
@UseGuards(OptionalAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * `:id/posts` is registered first so a username of "posts" cannot steal the
   * grid. Architecture §11: `GET /v1/users/:id/posts`.
   */
  @Get(':id/posts')
  async posts(
    @Param('id') userId: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<FeedPage> {
    const { cursor, limit } = postsQuerySchema.parse(query);
    return this.users.getPosts(userId, { cursor, limit, viewerId: request.user?.id });
  }

  @Get(':username')
  async byUsername(@Param('username') username: string): Promise<PublicProfile> {
    return this.users.getByUsername(username);
  }
}
