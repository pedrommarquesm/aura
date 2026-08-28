import { useCallback, useState } from 'react';

import { signInWithProvider, type AuthProvider } from '@/lib/api';
import { requestAppleIdentityToken } from '@/lib/auth/apple';
import { AuthNotConfiguredError, isAuthCanceled } from '@/lib/auth/errors';
import { requestGoogleIdentityToken } from '@/lib/auth/google';
import { messageForError } from '@/lib/api/error-message';
import { useSessionStore } from '@/store/session';

export function useSignIn() {
  const authenticate = useSessionStore((state) => state.authenticate);
  const [busy, setBusy] = useState<AuthProvider | null>(null);
  const [error, setError] = useState<unknown>(null);

  const signIn = useCallback(
    async (provider: AuthProvider) => {
      if (busy) return;

      setBusy(provider);
      setError(null);

      try {
        const proof =
          provider === 'apple'
            ? await requestAppleIdentityToken()
            : await requestGoogleIdentityToken();

        const result = await signInWithProvider(provider, proof.identityToken, proof.nonce);
        await authenticate(result, result.user, result.needsUsername);
      } catch (caught) {
        if (isAuthCanceled(caught)) return;
        setError(caught);
      } finally {
        setBusy(null);
      }
    },
    [authenticate, busy],
  );

  return {
    signIn,
    busy,
    error,
    errorMessage:
      error instanceof AuthNotConfiguredError ? null : error ? messageForError(error) : null,
    notConfigured: error instanceof AuthNotConfiguredError ? error.provider : null,
  };
}
