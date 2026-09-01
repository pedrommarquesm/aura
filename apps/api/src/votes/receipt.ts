import { RECEIPT_MAX_LENGTH } from '../db/schema/votes';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

/**
 * Normalizes an optional receipt.
 *
 * Empty or missing input becomes `null` — no receipt yet, not a validation
 * error, since a receipt is always optional (docs/redesign-tracker.md Q4).
 * A receipt with content past the cap is rejected outright rather than
 * silently truncated, so the client always knows what actually saved.
 */
export function normalizeReceipt(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) return null;

  if (trimmed.length > RECEIPT_MAX_LENGTH) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Receipt is too long', 400);
  }

  return trimmed;
}

/** Same cap, but for the "add a receipt after the fact" path, where empty is never valid. */
export function normalizeRequiredReceipt(value: string | null | undefined): string {
  const normalized = normalizeReceipt(value);

  if (normalized === null) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Receipt cannot be empty', 400);
  }

  return normalized;
}
