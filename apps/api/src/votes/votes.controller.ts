import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard, OptionalAuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AppError } from '../common/errors/app-error';
import { RECEIPT_MAX_LENGTH } from '../db/schema/votes';

import {
  DEFAULT_VOTE_LEDGER_LIMIT,
  MAX_VOTE_LEDGER_LIMIT,
  OVERLAY_RECEIPT_LIMIT,
  VotesService,
  type CastVoteResult,
  type SetReceiptResult,
  type VoteLedgerPage,
  type VoteReceiptRow,
} from './votes.service';

const castBodySchema = z.object({
  amount: z.number().int(),
  receipt: z.string().max(RECEIPT_MAX_LENGTH).optional(),
});

const receiptBodySchema = z.object({
  receipt: z.string().max(RECEIPT_MAX_LENGTH),
});

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_VOTE_LEDGER_LIMIT).default(DEFAULT_VOTE_LEDGER_LIMIT),
});

@Controller('posts/:id')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  /** One shot per user per post, -100..100. No self-vote, no unvote. */
  @Post('votes')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async cast(
    @Param('id') postId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<CastVoteResult> {
    if (!request.user) throw AppError.unauthorized();
    const input = castBodySchema.parse(body ?? {});
    return this.votes.castVote(request.user, postId, input.amount, input.receipt ?? null);
  }

  /** Fills a receipt that was left empty at release. Frozen after that (Q3). */
  @Patch('votes/receipt')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async setReceipt(
    @Param('id') postId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<SetReceiptResult> {
    if (!request.user) throw AppError.unauthorized();
    const input = receiptBodySchema.parse(body ?? {});
    return this.votes.addReceipt(request.user, postId, input.receipt);
  }

  /** The receipt ledger, newest first. */
  @Get('votes')
  @UseGuards(OptionalAuthGuard)
  async list(
    @Param('id') postId: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<VoteLedgerPage> {
    const { cursor, limit } = listQuerySchema.parse(query);
    return this.votes.list(postId, { cursor, limit, viewerId: request.user?.id });
  }

  /** The newest receipts with text — what floats in-feed. */
  @Get('votes/overlay')
  @UseGuards(OptionalAuthGuard)
  async overlay(@Param('id') postId: string): Promise<VoteReceiptRow[]> {
    return this.votes.latestReceipts(postId, OVERLAY_RECEIPT_LIMIT);
  }
}
