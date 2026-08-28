import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { OptionalAuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

import { LeaderboardService, type LeaderboardPage } from './leaderboard.service';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

@Controller('leaderboards')
@UseGuards(OptionalAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get('global')
  async global(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<LeaderboardPage> {
    const { limit } = querySchema.parse(query);
    return this.leaderboard.global(request.user?.id, limit);
  }
}
