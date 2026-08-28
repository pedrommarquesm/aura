import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'aura.refresh_token';
const SESSION_META_KEY = 'aura.session_meta';

/**
 * SecureStore is Keychain/Keystore-backed and has no web implementation. Web is only
 * ever a bundling and preview target for this app (posting and Aura actions are
 * mobile-only by product rule), so there is nothing to fall back to — and quietly
 * writing tokens to `localStorage` would be worse than not persisting them.
 */
const available = Platform.OS !== 'web';

const STORE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function readRefreshToken(): Promise<string | null> {
  if (!available) return null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function writeRefreshToken(token: string): Promise<void> {
  if (!available) return;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, STORE_OPTIONS);
}

export async function clearRefreshToken(): Promise<void> {
  if (!available) return;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export type SessionMeta = {
  /** First-login onboarding still outstanding. Survives a cold start. */
  needsUsername: boolean;
};

export async function readSessionMeta(): Promise<SessionMeta | null> {
  if (!available) return null;

  const raw = await SecureStore.getItemAsync(SESSION_META_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionMeta>;
    return { needsUsername: parsed.needsUsername === true };
  } catch {
    return null;
  }
}

export async function writeSessionMeta(meta: SessionMeta): Promise<void> {
  if (!available) return;
  await SecureStore.setItemAsync(SESSION_META_KEY, JSON.stringify(meta), STORE_OPTIONS);
}

export async function clearSessionMeta(): Promise<void> {
  if (!available) return;
  await SecureStore.deleteItemAsync(SESSION_META_KEY);
}
