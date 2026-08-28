import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AppError } from '../common/errors/app-error';

import { REPORT_REASONS, REPORT_TARGETS, SafetyService } from './safety.service';

const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().min(1).max(64),
  reason: z.enum(REPORT_REASONS),
  note: z.string().max(500).optional().nullable(),
});

const blockSchema = z.object({
  userId: z.string().min(1).max(64),
});

@Controller()
@UseGuards(AuthGuard)
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post('reports')
  @HttpCode(HttpStatus.OK)
  async report(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.safety.report(request.user, reportSchema.parse(body));
  }

  @Post('blocks')
  @HttpCode(HttpStatus.OK)
  async block(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.safety.block(request.user, blockSchema.parse(body).userId);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.OK)
  async unblock(@Param('userId') userId: string, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.safety.unblock(request.user, userId);
  }
}
