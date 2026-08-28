import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { AuthCanceledError, AuthNotConfiguredError } from './errors';
import { createNonce } from './nonce';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

function googleClientId(): string | undefined {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  // Expo Go proxies through auth.expo.io, whose `aud` is the web client id.
  if (Constants.appOwnership === 'expo') return web;
  if (Platform.OS === 'ios') return ios ?? web;
  if (Platform.OS === 'android') return android ?? web;
  return web;
}

export function isGoogleConfigured(): boolean {
  return Boolean(googleClientId());
}

/**
 * Opens Google's account picker and returns an ID token the API can verify.
 *
 * Native Google Sign-In (`@react-native-google-signin/google-signin`) is the
 * production sheet; AuthSession is what Expo Go and a first development build
 * can actually complete, and the token is the same JWT the API already checks.
 */
export async function requestGoogleIdentityToken(): Promise<{
  identityToken: string;
  nonce: string;
}> {
  const clientId = googleClientId();
  if (!clientId) throw new AuthNotConfiguredError('google');

  const nonce = await createNonce();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'aura', path: 'oauth' });

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: false,
    extraParams: { nonce, prompt: 'select_account' },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new AuthCanceledError();
  }

  if (result.type !== 'success') {
    throw new Error('Google sign-in did not return an identity token');
  }

  const identityToken = result.params.id_token;
  if (!identityToken) {
    throw new Error('Google sign-in did not return an identity token');
  }

  return { identityToken, nonce };
}
