import { describe, expect, it } from 'vitest';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

import { normalizeReceipt, normalizeRequiredReceipt } from './receipt';

describe('normalizeReceipt', () => {
  it('trims a real receipt', () => {
    expect(normalizeReceipt('  clean recovery  ')).toBe('clean recovery');
  });

  it('turns empty or missing input into null — a receipt is always optional', () => {
    expect(normalizeReceipt('')).toBeNull();
    expect(normalizeReceipt('   ')).toBeNull();
    expect(normalizeReceipt(undefined)).toBeNull();
    expect(normalizeReceipt(null)).toBeNull();
  });

  it('rejects a receipt past the 80 character cap (Q5)', () => {
    expect(() => normalizeReceipt('a'.repeat(81))).toThrow(AppError);
  });

  it('keeps a receipt at exactly the cap', () => {
    const receipt = 'a'.repeat(80);
    expect(normalizeReceipt(receipt)).toBe(receipt);
  });
});

describe('normalizeRequiredReceipt', () => {
  it('rejects empty input — filling a receipt after the fact must have content', () => {
    try {
      normalizeRequiredReceipt('   ');
      throw new Error('expected normalizeRequiredReceipt to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.VALIDATION_FAILED);
    }
  });

  it('accepts real content', () => {
    expect(normalizeRequiredReceipt('forced pose')).toBe('forced pose');
  });
});
