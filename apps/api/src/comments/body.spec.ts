import { describe, expect, it } from 'vitest';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

import { COMMENT_MAX_LENGTH, normalizeCommentBody } from './body';

describe('normalizeCommentBody', () => {
  it('trims a real comment', () => {
    expect(normalizeCommentBody('  nice shot  ')).toBe('nice shot');
  });

  it('rejects a blank comment', () => {
    expect(() => normalizeCommentBody('   ')).toThrow(AppError);
    expect(() => normalizeCommentBody('')).toThrow(AppError);
    try {
      normalizeCommentBody('');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.VALIDATION_FAILED);
    }
  });

  it('rejects a comment past the cap', () => {
    expect(() => normalizeCommentBody('a'.repeat(COMMENT_MAX_LENGTH + 1))).toThrow(AppError);
  });

  it('keeps a comment at the cap', () => {
    const body = 'a'.repeat(COMMENT_MAX_LENGTH);
    expect(normalizeCommentBody(body)).toBe(body);
  });
});
