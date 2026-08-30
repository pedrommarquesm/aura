import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard, OptionalAuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AppError } from '../common/errors/app-error';

import { COMMENT_MAX_LENGTH } from './body';
import {
  CommentsService,
  DEFAULT_COMMENT_LIMIT,
  MAX_COMMENT_LIMIT,
  type CommentPage,
  type CreateCommentResult,
} from './comments.service';

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_COMMENT_LIMIT).default(DEFAULT_COMMENT_LIMIT),
});

const createBodySchema = z.object({
  body: z.string().max(COMMENT_MAX_LENGTH),
});

@Controller('posts/:id/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  async list(
    @Param('id') postId: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<CommentPage> {
    const { cursor, limit } = listQuerySchema.parse(query);
    return this.comments.list(postId, { cursor, limit, viewerId: request.user?.id });
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async create(
    @Param('id') postId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateCommentResult> {
    if (!request.user) throw AppError.unauthorized();
    const input = createBodySchema.parse(body ?? {});
    return this.comments.create(request.user, postId, input.body);
  }
}
