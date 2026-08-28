import { create } from 'zustand';

import { api, type AuthTokens } from '@/lib/api';
import { fetchMe, logout } from '@/lib/api/auth';
import type { PublicUser } from '@/lib/api/types';
import {
  clearRefreshToken,
  clearSessionMeta,
  readRefreshToken,
  readSessionMeta,
  writeRefreshToken,
  writeSessionMeta,
} from '@/lib/secure-storage';

export type SessionStatus = 'restoring' | 'guest' | 'authenticated';

type SessionState = {
  status: SessionStatus;
  /**
   * Access token, memory only (§12.5). It is intentionally not persisted: it lives
   * ~15 minutes and the refresh token in SecureStore is what survives a cold start.
   */
  accessToken: string | null;
  user: PublicUser | null;
  needsUsername: boolean;
  restore: () => Promise<void>;
  authenticate: (tokens: AuthTokens, user: PublicUser, needsUsername: boolean) => Promise<void>;
  setUser: (user: PublicUser) => void;
  finishUsernameClaim: (user: PublicUser) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Client/session state only. Anything the API owns — the profile, the feed, Aura
 * totals — belongs in TanStack Query, not here. `user` is the exception: the
 * auth screens need it before any query has run, and it is small.
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'restoring',
  accessToken: null,
  user: null,
  needsUsername: false,

  async restore() {
    const refreshToken = await readRefreshToken();
    if (!refreshToken) {
      set({ status: 'guest', accessToken: null, user: null, needsUsername: false });
      return;
    }

    const meta = await readSessionMeta();

    try {
      // No access token yet: `/auth/me` 401s and the interceptor rotates the
      // refresh token, which is how a cold start becomes a live session.
      const { user } = await fetchMe();
      set({
        status: 'authenticated',
        user,
        needsUsername: meta?.needsUsername === true,
      });
    } catch {
      await get().signOut();
    }
  },

  async authenticate(tokens, user, needsUsername) {
    await writeRefreshToken(tokens.refreshToken);
    await writeSessionMeta({ needsUsername });
    set({
      status: 'authenticated',
      accessToken: tokens.accessToken,
      user,
      needsUsername,
    });
  },

  setUser(user) {
    set({ user });
  },

  async finishUsernameClaim(user) {
    await writeSessionMeta({ needsUsername: false });
    set({ user, needsUsername: false });
  },

  async signOut() {
    try {
      if (get().accessToken) await logout();
    } catch {
      // Local sign-out still has to succeed if the network is down.
    }

    await clearRefreshToken();
    await clearSessionMeta();
    set({ status: 'guest', accessToken: null, user: null, needsUsername: false });
  },
}));

/**
 * Wires the API client to the store. Done at module scope so the bridge exists before
 * any component can fire a request; `restore()` is still an explicit call from the
 * root layout because it touches the Keychain.
 */
api.attachSession({
  getAccessToken: () => useSessionStore.getState().accessToken,
  getRefreshToken: readRefreshToken,
  onTokensRotated: async (tokens) => {
    await writeRefreshToken(tokens.refreshToken);
    useSessionStore.setState({ status: 'authenticated', accessToken: tokens.accessToken });
  },
  onSessionExpired: () => useSessionStore.getState().signOut(),
});

export const useIsAuthenticated = () =>
  useSessionStore((state) => state.status === 'authenticated');
