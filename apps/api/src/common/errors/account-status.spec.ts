import { describe, expect, it } from 'vitest';

import { accountStatusError, assertAccountActive } from './account-status';
import { ErrorCode } from './error-codes';

describe('accountStatusError', () => {
  it('lets an active account through', () => {
    expect(accountStatusError('active')).toBeNull();
    expect(() => assertAccountActive('active')).not.toThrow();
  });

  it('uses a distinct code for a suspension so the client can say so', () => {
    const error = accountStatusError('suspended');

    expect(error?.code).toBe(ErrorCode.ACCOUNT_SUSPENDED);
    expect(error?.getStatus()).toBe(403);
  });

  it('uses a distinct code for a ban, not the generic forbidden', () => {
    const error = accountStatusError('banned');

    expect(error?.code).toBe(ErrorCode.ACCOUNT_BANNED);
    expect(error?.getStatus()).toBe(403);
  });
});
