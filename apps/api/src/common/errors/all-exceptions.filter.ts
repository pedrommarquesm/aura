import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { ErrorCode, type ErrorCodeValue } from './error-codes';

/** Widened to `string` because Fastify plugin errors carry their own codes. */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    /** Field-level detail, only populated for validation failures. */
    fields?: Array<{ path: string; message: string }>;
  };
}

/** Plain number so comparisons against a raw HTTP status stay type-safe. */
const SERVER_ERROR_STATUS = 500;

const STATUS_TO_CODE: Partial<Record<number, ErrorCodeValue>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};

/**
 * Turns every thrown value into the single error envelope the clients expect:
 * `{ error: { code, message, requestId } }`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = String(request.id ?? '');

    const { status, body } = this.describe(exception, requestId);

    if (status >= SERVER_ERROR_STATUS) {
      request.log.error({ err: exception, requestId }, 'unhandled request error');
    } else {
      request.log.warn(
        { err: exception, requestId, code: body.error.code, status },
        'request failed',
      );
    }

    void reply.status(status).send(body);
  }

  private describe(exception: unknown, requestId: string): { status: number; body: ErrorEnvelope } {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          error: {
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Request validation failed',
            requestId,
            fields: exception.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // AppError sends { code, message }. Nest's built-in exceptions send
      // { statusCode, message, error } or a bare string, so both are handled.
      const { code, message } = this.readHttpExceptionBody(response, status, exception.message);

      return { status, body: { error: { code, message, requestId } } };
    }

    // Fastify and its plugins throw plain errors carrying `statusCode` rather
    // than Nest exceptions: malformed JSON, unsupported content type, a body
    // over the limit. Honour that status instead of reporting someone else's
    // 400 as our 500.
    const fastifyStatus = this.readFastifyStatus(exception);
    if (fastifyStatus && fastifyStatus < SERVER_ERROR_STATUS) {
      return {
        status: fastifyStatus,
        body: {
          error: {
            code: STATUS_TO_CODE[fastifyStatus] ?? ErrorCode.BAD_REQUEST,
            message: this.readMessage(exception) ?? 'Request rejected',
            requestId,
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: ErrorCode.INTERNAL,
          // Never leak internal messages: they routinely contain connection
          // strings, SQL, and stack details.
          message: 'Something went wrong',
          requestId,
        },
      },
    };
  }

  private readFastifyStatus(exception: unknown): number | undefined {
    if (!exception || typeof exception !== 'object') return undefined;

    const status = (exception as { statusCode?: unknown }).statusCode;
    return typeof status === 'number' && status >= 400 && status <= 599 ? status : undefined;
  }

  private readMessage(exception: unknown): string | undefined {
    if (!exception || typeof exception !== 'object') return undefined;

    const message = (exception as { message?: unknown }).message;
    return typeof message === 'string' && message.length > 0 ? message : undefined;
  }

  private readHttpExceptionBody(
    response: unknown,
    status: number,
    fallbackMessage: string,
  ): { code: string; message: string } {
    const fallbackCode = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL;

    if (typeof response === 'string') {
      return { code: fallbackCode, message: response };
    }

    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      const code = typeof record.code === 'string' ? record.code : fallbackCode;
      const rawMessage = record.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : fallbackMessage;

      return { code, message };
    }

    return { code: fallbackCode, message: fallbackMessage };
  }
}
