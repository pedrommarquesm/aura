import { HttpException, HttpStatus, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { AllExceptionsFilter, type ErrorEnvelope } from './all-exceptions.filter';
import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

function invoke(exception: unknown): { status: number; body: ErrorEnvelope } {
  const captured = { status: 0, body: undefined as unknown as ErrorEnvelope };

  const reply = {
    status: (code: number) => {
      captured.status = code;
      return { send: (body: ErrorEnvelope) => (captured.body = body) };
    },
  };

  const request = {
    id: 'req-1',
    log: { error: vi.fn(), warn: vi.fn() },
  };

  const host = {
    switchToHttp: () => ({ getResponse: () => reply, getRequest: () => request }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);

  return captured;
}

describe('AllExceptionsFilter', () => {
  it('preserves the code and status of an AppError', () => {
    const result = invoke(
      new AppError(ErrorCode.ALREADY_LIKED, 'Already liked', HttpStatus.CONFLICT),
    );

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe(ErrorCode.ALREADY_LIKED);
    expect(result.body.error.message).toBe('Already liked');
    expect(result.body.error.requestId).toBe('req-1');
  });

  it('maps built-in Nest exceptions onto a stable code', () => {
    const result = invoke(new NotFoundException('Cannot GET /v1/nope'));

    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('reports Zod failures with field-level detail', () => {
    const parsed = z.object({ caption: z.string() }).safeParse({ caption: 42 });

    const result = invoke(parsed.success ? new Error('expected failure') : parsed.error);

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(result.body.error.fields?.[0]?.path).toBe('caption');
  });

  it('honours the status of Fastify plugin errors instead of reporting 500', () => {
    // Fastify throws plain errors carrying `statusCode`: malformed JSON, a body
    // over the limit, or a rate limit rejection.
    const fastifyError = Object.assign(new Error('Body is not valid JSON'), { statusCode: 400 });

    const result = invoke(fastifyError);

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe(ErrorCode.BAD_REQUEST);
  });

  it('never leaks internal messages on an unexpected error', () => {
    const result = invoke(new Error('connection string postgres://user:hunter2@db/aura failed'));

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe(ErrorCode.INTERNAL);
    expect(result.body.error.message).toBe('Something went wrong');
    expect(JSON.stringify(result.body)).not.toContain('hunter2');
  });

  it('falls back to 500 for a server-side HttpException', () => {
    const result = invoke(new HttpException('upstream exploded', 502));

    expect(result.status).toBe(502);
  });
});
