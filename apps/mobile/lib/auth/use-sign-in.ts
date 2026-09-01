import { useCallback, useState } from 'react';

import {
  registerWithPassword,
  signInWithPassword,
  signInWithProvider,
  type AuthProvider,
} from '@/lib/api';
import { requestAppleIdentityToken } from '@/lib/auth/apple';
import { AuthNotConfiguredError, isAuthCanceled } from '@/lib/auth/errors';
import { requestGoogleIdentityToken } from '@/lib/auth/google';
import { messageForError } from '@/lib/api/error-message';
import { useSessionStore } from '@/store/session';

export function useSignIn() {
  const authenticate = useSessionStore((state) => state.authenticate);
  const [busy, setBusy] = useState<AuthProvider | 'password' | 'register' | null>(null);
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

  const signInPassword = useCallback(
    async (identifier: string, password: string) => {
      if (busy) return;
      setBusy('password');
      setError(null);
      try {
        const result = await signInWithPassword(identifier.trim(), password);
        await authenticate(result, result.user, result.needsUsername);
      } catch (caught) {
        setError(caught);
      } finally {
        setBusy(null);
      }
    },
    [authenticate, busy],
  );

  const registerPassword = useCallback(
    async (input: { email: string; username: string; password: string }) => {
      if (busy) return;
      setBusy('register');
      setError(null);
      try {
        const result = await registerWithPassword({
          email: input.email.trim(),
          username: input.username.trim(),
          password: input.password,
        });
        await authenticate(result, result.user, result.needsUsername);
      } catch (caught) {
        setError(caught);
      } finally {
        setBusy(null);
      }
    },
    [authenticate, busy],
  );

  return {
    signIn,
    signInPassword,
    registerPassword,
    busy,
    error,
    errorMessage:
      error instanceof AuthNotConfiguredError ? null : error ? messageForError(error) : null,
    notConfigured: error instanceof AuthNotConfiguredError ? error.provider : null,
  };
}
