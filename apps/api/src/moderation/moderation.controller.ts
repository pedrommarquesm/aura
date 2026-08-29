import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { ModerationGuard } from './moderation.guard';
import { ModerationService } from './moderation.service';

const statusSchema = z.object({
  status: z.enum(['active', 'suspended', 'banned']),
});

const removeSchema = z.object({
  reason: z.string().max(500).optional(),
});

@Controller('moderation')
@UseGuards(ModerationGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async setStatus(@Param('id') userId: string, @Body() body: unknown) {
    const { status } = statusSchema.parse(body);
    return this.moderation.setUserStatus(userId, status);
  }

  @Post('posts/:id/remove')
  @HttpCode(HttpStatus.OK)
  async removePost(@Param('id') postId: string, @Body() body: unknown) {
    removeSchema.parse(body ?? {});
    return this.moderation.removePost(postId, { reason: 'takedown' });
  }
}
