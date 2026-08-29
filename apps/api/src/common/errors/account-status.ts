import { HttpStatus } from '@nestjs/common';

import type { User } from '../../db/schema';

import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

/**
 * Rejects a suspended or banned account with a stable code the clients can
 * branch on. `forbidden` is not enough: the app has to know to drop the
 * session and stop retrying, rather than show a generic "not allowed".
 *
 * Access tokens are stateless, so this check (plus session revocation) is
 * what makes a ban take effect before the JWT happens to expire.
 */
export function accountStatusError(status: User['status']): AppError | null {
  if (status === 'active') return null;

  if (status === 'banned') {
    return new AppError(
      ErrorCode.ACCOUNT_BANNED,
      'This account has been banned',
      HttpStatus.FORBIDDEN,
    );
  }

  return new AppError(
    ErrorCode.ACCOUNT_SUSPENDED,
    'This account is suspended',
    HttpStatus.FORBIDDEN,
  );
}

export function assertAccountActive(status: User['status']): void {
  const error = accountStatusError(status);
  if (error) throw error;
}
