import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { WaitlistService, type WaitlistPublic } from './waitlist.service';

const joinSchema = z.object({
  email: z.string().min(3).max(320),
  username: z.string().min(3).max(30),
  referralCode: z.string().max(16).optional().nullable(),
  locale: z.string().max(16).optional().nullable(),
});

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async join(@Body() body: unknown, @Req() request: FastifyRequest): Promise<WaitlistPublic> {
    const input = joinSchema.parse(body ?? {});
    return this.waitlist.join(input, request.ip);
  }
}
