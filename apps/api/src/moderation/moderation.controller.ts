import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { ModerationGuard, type ModerationRequest } from './moderation.guard';
import { ModerationService } from './moderation.service';

const statusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned']),
  reason: z.string().max(500).optional(),
});

const removeSchema = z.object({
  reason: z.string().max(500).optional(),
});

const pageSchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const reportsQuerySchema = pageSchema.extend({
  status: z.enum(['open', 'dismissed', 'actioned']).optional(),
});

const resolveSchema = z.object({
  reason: z.string().max(500).optional(),
});

@Controller('moderation')
@UseGuards(ModerationGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('reports')
  listReports(@Query() query: Record<string, string | undefined>) {
    return this.moderation.listReports(reportsQuerySchema.parse(query));
  }

  @Post('reports/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissReport(
    @Param('id') reportId: string,
    @Body() body: unknown,
    @Req() request: ModerationRequest,
  ) {
    const { reason } = resolveSchema.parse(body ?? {});
    return this.moderation.resolveReport(reportId, 'dismissed', {
      staffId: request.staff?.id,
      reason,
    });
  }

  @Post('reports/:id/action')
  @HttpCode(HttpStatus.OK)
  async actionReport(
    @Param('id') reportId: string,
    @Body() body: unknown,
    @Req() request: ModerationRequest,
  ) {
    const { reason } = resolveSchema.parse(body ?? {});
    return this.moderation.resolveReport(reportId, 'actioned', {
      staffId: request.staff?.id,
      reason,
    });
  }

  @Get('actions')
  listActions(@Query() query: Record<string, string | undefined>) {
    return this.moderation.listActions(pageSchema.parse(query));
  }

  @Post('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async setStatus(
    @Param('id') userId: string,
    @Body() body: unknown,
    @Req() request: ModerationRequest,
  ) {
    const { status, reason } = statusSchema.parse(body);
    return this.moderation.setUserStatus(userId, status, {
      staffId: request.staff?.id,
      reason,
    });
  }

  @Post('posts/:id/remove')
  @HttpCode(HttpStatus.OK)
  async removePost(
    @Param('id') postId: string,
    @Body() body: unknown,
    @Req() request: ModerationRequest,
  ) {
    const { reason } = removeSchema.parse(body ?? {});
    return this.moderation.removePost(postId, {
      reason: 'takedown',
      staffId: request.staff?.id,
      note: reason,
    });
  }
}
