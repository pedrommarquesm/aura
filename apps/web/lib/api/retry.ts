import { ApiError } from "./errors";

/** 5xx and 429 are worth another try. Auth and validation are not. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 429;
  }
  return false;
}
