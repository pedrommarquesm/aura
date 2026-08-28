/** The user dismissed the native Apple/Google sheet. Not an error to show. */
export class AuthCanceledError extends Error {
  constructor() {
    super('canceled');
    this.name = 'AuthCanceledError';
  }
}

/** Provider client ids are missing in this build, or the OS cannot present the sheet. */
export class AuthNotConfiguredError extends Error {
  readonly provider: 'apple' | 'google';

  constructor(provider: 'apple' | 'google') {
    super(`${provider} is not configured`);
    this.name = 'AuthNotConfiguredError';
    this.provider = provider;
  }
}

export function isAuthCanceled(error: unknown): boolean {
  if (error instanceof AuthCanceledError) return true;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code === 'ERR_REQUEST_CANCELED';
  }
  return false;
}
