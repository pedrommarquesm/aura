import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { ContactService } from './contact.service';

const submitSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().min(3).max(320),
  message: z.string().min(10).max(2000),
  locale: z.string().max(16).optional().nullable(),
});

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async submit(@Body() body: unknown, @Req() request: FastifyRequest) {
    return this.contact.submit(submitSchema.parse(body ?? {}), request.ip);
  }
}
