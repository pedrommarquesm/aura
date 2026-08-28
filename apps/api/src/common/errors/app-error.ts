import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode, type ErrorCodeValue } from './error-codes';

interface AppErrorOptions {
  /** Extra context for logs and debugging. Never returned to the client. */
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * Application error carrying a stable client-facing code alongside its status.
 *
 * Throw this instead of raw HttpException so every failure the client can act
 * on has a code it can branch on.
 */
export class AppError extends HttpException {
  readonly code: ErrorCodeValue;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCodeValue,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    options: AppErrorOptions = {},
  ) {
    super({ code, message }, status, { cause: options.cause });
    this.code = code;
    this.details = options.details;
  }

  static badRequest(message: string, options?: AppErrorOptions): AppError {
    return new AppError(ErrorCode.BAD_REQUEST, message, HttpStatus.BAD_REQUEST, options);
  }

  static unauthorized(message = 'Authentication required', options?: AppErrorOptions): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED, options);
  }

  static forbidden(message = 'Not allowed', options?: AppErrorOptions): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN, options);
  }

  static notFound(message = 'Not found', options?: AppErrorOptions): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND, options);
  }

  static conflict(code: ErrorCodeValue, message: string, options?: AppErrorOptions): AppError {
    return new AppError(code, message, HttpStatus.CONFLICT, options);
  }

  static unavailable(message = 'Service unavailable', options?: AppErrorOptions): AppError {
    return new AppError(
      ErrorCode.SERVICE_UNAVAILABLE,
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      options,
    );
  }
}
