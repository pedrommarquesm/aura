import { Controller, Headers, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AppError } from '../common/errors/app-error';
import { ENV, type Env } from '../config/env';

import { MuxWebhookService } from './mux-webhook.service';
import { MuxVideoService } from './mux.service';
import { verifyMuxWebhookSignature } from './mux-signature';

/**
 * Mux → API. Public on purpose: authenticity is the HMAC, not a JWT.
 *
 * URL: `POST /v1/webhooks/mux`
 */
@Controller('webhooks')
export class MuxWebhookController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly mux: MuxVideoService,
    private readonly webhooks: MuxWebhookService,
  ) {}

  @Post('mux')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() request: FastifyRequest,
    @Headers('mux-signature') signature: string | undefined,
  ) {
    if (!this.mux.webhookConfigured) {
      throw AppError.unavailable('Mux webhooks are not configured');
    }

    const rawBody = readRawBody(request);
    const secret = this.env.MUX_WEBHOOK_SECRET ?? '';

    if (!verifyMuxWebhookSignature({ rawBody, signatureHeader: signature, secret })) {
      throw AppError.unauthorized('Invalid Mux webhook signature');
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody) as unknown;
    } catch {
      throw AppError.badRequest('Mux webhook body is not JSON');
    }

    if (!event || typeof event !== 'object') {
      throw AppError.badRequest('Mux webhook body is empty');
    }

    return this.webhooks.handle(event);
  }
}

function readRawBody(request: FastifyRequest): string {
  const raw = (request as FastifyRequest & { rawBody?: Buffer | string }).rawBody;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Buffer.isBuffer(raw) && raw.length > 0) return raw.toString('utf8');
  throw AppError.badRequest('Mux webhook is missing its raw body');
}
