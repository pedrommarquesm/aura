/**
 * The API answers failures with `{ error: { code, message } }` and an HTTP status
 * (architecture §11). `code` is the stable part — branch on it, never on `message`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Transport failed: offline, DNS, TLS, or our own timeout. Worth retrying. */
export class NetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

/** Refresh failed or there was nothing to refresh with. The user must sign in again. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) return error.status >= 500 || error.status === 429;
  return false;
}
