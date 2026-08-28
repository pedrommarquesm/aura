import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AppError } from '../common/errors/app-error';

import { LikesService, type LikeResult } from './likes.service';

@Controller('posts/:id')
@UseGuards(AuthGuard)
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Post('like')
  @HttpCode(HttpStatus.OK)
  async like(
    @Param('id') postId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LikeResult> {
    if (!request.user) throw AppError.unauthorized();
    return this.likes.like(request.user, postId);
  }

  @Delete('like')
  @HttpCode(HttpStatus.OK)
  async unlike(
    @Param('id') postId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LikeResult> {
    if (!request.user) throw AppError.unauthorized();
    return this.likes.unlike(request.user, postId);
  }
}
