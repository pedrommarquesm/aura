import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { AuthCanceledError, AuthNotConfiguredError, isAuthCanceled } from './errors';
import { createNonce, sha256Hex } from './nonce';

export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Native Sign in with Apple sheet.
 *
 * Apple SHA-256-hashes the nonce we pass and puts that hash on the identity
 * token. The API compares `payload.nonce` to the nonce we POST, so we send the
 * hash, not the raw value.
 */
export async function requestAppleIdentityToken(): Promise<{
  identityToken: string;
  nonce: string;
}> {
  if (!(await isAppleAvailable())) {
    throw new AuthNotConfiguredError('apple');
  }

  const rawNonce = await createNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: rawNonce,
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign-in did not return an identity token');
    }

    return { identityToken: credential.identityToken, nonce: hashedNonce };
  } catch (error) {
    if (isAuthCanceled(error)) throw new AuthCanceledError();
    throw error;
  }
}
