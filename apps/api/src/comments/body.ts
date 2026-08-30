import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

/** Shorter than captions. A comment is a reaction, not a second post. */
export const COMMENT_MAX_LENGTH = 500;

export function normalizeCommentBody(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Comment cannot be empty', 400);
  }

  if (trimmed.length > COMMENT_MAX_LENGTH) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Comment is too long', 400);
  }

  return trimmed;
}
