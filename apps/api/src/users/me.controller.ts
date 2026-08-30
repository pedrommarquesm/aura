import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AppError } from '../common/errors/app-error';

import { AvatarService } from './avatar.service';

const createAvatarUploadSchema = z.object({
  contentType: z.string().min(1).max(100),
  byteSize: z.coerce.number().int().positive(),
  width: z.coerce.number().int().positive().max(4_096).optional(),
  height: z.coerce.number().int().positive().max(4_096).optional(),
});

const completeAvatarUploadSchema = z.object({
  uploadId: z.string().min(1).max(80),
});

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly avatars: AvatarService) {}

  @Post('avatar/uploads')
  @HttpCode(HttpStatus.OK)
  async createAvatarUpload(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.avatars.create(request.user, createAvatarUploadSchema.parse(body));
  }

  @Post('avatar/complete')
  @HttpCode(HttpStatus.OK)
  async completeAvatarUpload(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.avatars.complete(request.user, completeAvatarUploadSchema.parse(body ?? {}));
  }
}
