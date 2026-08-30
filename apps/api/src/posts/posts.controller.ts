import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard, OptionalAuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AppError } from '../common/errors/app-error';
import { FeedService, type FeedCard } from '../feed/feed.service';
import { UploadsService } from '../media/uploads.service';
import { ModerationService } from '../moderation/moderation.service';
import { CAPTION_MAX_LENGTH } from './caption';
import { PostsService } from './posts.service';

const createUploadSchema = z.object({
  contentType: z.string().min(1).max(100),
  byteSize: z.coerce.number().int().positive(),
  checksum: z.string().min(32).max(128).optional(),
  width: z.coerce.number().int().positive().max(12_000).optional(),
  height: z.coerce.number().int().positive().max(12_000).optional(),
  durationMs: z.coerce.number().int().nonnegative().max(600_000).optional(),
});

const completeUploadSchema = z.object({
  caption: z.string().max(CAPTION_MAX_LENGTH).optional().nullable(),
});

const updateCaptionSchema = z.object({
  caption: z.string().max(CAPTION_MAX_LENGTH).nullable(),
});

export type PostResponse = FeedCard & {
  status: 'uploading' | 'processing' | 'published' | 'failed' | 'removed';
};

@Controller('posts')
export class PostsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly feed: FeedService,
    private readonly moderation: ModerationService,
    private readonly posts: PostsService,
  ) {}

  @Post('uploads')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createUpload(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.uploads.create(request.user, createUploadSchema.parse(body));
  }

  @Post(':id/uploads')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async refreshUpload(@Param('id') postId: string, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.uploads.refresh(request.user, postId);
  }

  @Post(':id/complete')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('id') postId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.user) throw AppError.unauthorized();
    const input = completeUploadSchema.parse(body ?? {});
    return this.uploads.complete(request.user, postId, input);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateCaption(
    @Param('id') postId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.user) throw AppError.unauthorized();
    const input = updateCaptionSchema.parse(body ?? {});
    return this.posts.updateCaption(request.user.id, postId, input.caption);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') postId: string, @Req() request: AuthenticatedRequest) {
    if (!request.user) throw AppError.unauthorized();
    return this.moderation.removePost(postId, {
      actorId: request.user.id,
      reason: 'author_delete',
    });
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async get(@Param('id') postId: string, @Req() request: AuthenticatedRequest): Promise<PostResponse> {
    const found = await this.feed.getPost(postId, request.user?.id);

    if (!found) throw AppError.notFound('Post not found');

    const isAuthor = found.authorId === request.user?.id;
    if (found.status !== 'published' && !isAuthor) {
      throw AppError.notFound('Post not found');
    }

    return { ...found.card, status: found.status };
  }
}
