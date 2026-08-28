import { create } from 'zustand';

import { api, type AuthTokens } from '@/lib/api';
import { clearRefreshToken, readRefreshToken, writeRefreshToken } from '@/lib/secure-storage';

export type SessionStatus = 'restoring' | 'guest' | 'authenticated';

type SessionState = {
  status: SessionStatus;
  /**
   * Access token, memory only (§12.5). It is intentionally not persisted: it lives
   * ~15 minutes and the refresh token in SecureStore is what survives a cold start.
   */
  accessToken: string | null;
  restore: () => Promise<void>;
  authenticate: (tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Client/session state only. Anything the API owns — the profile, the feed, Aura
 * totals — belongs in TanStack Query, not here.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'restoring',
  accessToken: null,

  async restore() {
    const refreshToken = await readRefreshToken();
    // Presence of a refresh token is not proof of a live session, but we can treat the
    // user as signed in and let the first 401 rotate or revoke it.
    set({ status: refreshToken ? 'authenticated' : 'guest' });
  },

  async authenticate(tokens) {
    await writeRefreshToken(tokens.refreshToken);
    set({ status: 'authenticated', accessToken: tokens.accessToken });
  },

  async signOut() {
    await clearRefreshToken();
    set({ status: 'guest', accessToken: null });
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
