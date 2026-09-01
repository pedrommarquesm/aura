import { api } from './client';
import { devicePayload, signInLocale } from '@/lib/auth/device';
import type { PublicUser, SignInResponse } from './types';

export type AuthProvider = 'apple' | 'google';

export function signInWithProvider(
  provider: AuthProvider,
  identityToken: string,
  nonce?: string,
): Promise<SignInResponse> {
  return api.post<SignInResponse>(`/auth/${provider}`, {
    identityToken,
    nonce,
    locale: signInLocale(),
    device: devicePayload(),
  });
}

export function signInWithPassword(identifier: string, password: string): Promise<SignInResponse> {
  return api.post<SignInResponse>('/auth/login', {
    identifier,
    password,
    locale: signInLocale(),
    device: devicePayload(),
  });
}

export function registerWithPassword(input: {
  email: string;
  username: string;
  password: string;
}): Promise<SignInResponse> {
  return api.post<SignInResponse>('/auth/register', {
    ...input,
    locale: signInLocale(),
    device: devicePayload(),
  });
}

export function fetchMe(signal?: AbortSignal): Promise<{ user: PublicUser }> {
  return api.get<{ user: PublicUser }>('/auth/me', { signal });
}

export function claimUsername(username: string): Promise<{ user: PublicUser }> {
  return api.post<{ user: PublicUser }>('/auth/username', { username });
}

export function logout(): Promise<void> {
  return api.post<void>('/auth/logout');
}
