import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'aura.refresh_token';

/**
 * SecureStore is Keychain/Keystore-backed and has no web implementation. Web is only
 * ever a bundling and preview target for this app (posting and Aura actions are
 * mobile-only by product rule), so there is nothing to fall back to — and quietly
 * writing tokens to `localStorage` would be worse than not persisting them.
 */
const available = Platform.OS !== 'web';

export async function readRefreshToken(): Promise<string | null> {
  if (!available) return null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function writeRefreshToken(token: string): Promise<void> {
  if (!available) return;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearRefreshToken(): Promise<void> {
  if (!available) return;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
