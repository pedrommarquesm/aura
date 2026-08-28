import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { NativeModules, Platform } from 'react-native';

import { AuthCanceledError, AuthNotConfiguredError } from './errors';
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_IOS_URL_SCHEME,
  GOOGLE_WEB_CLIENT_ID,
  googleClientIdForPlatform,
} from './google-clients';
import { createNonce } from './nonce';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function nativeGoogleModulePresent(): boolean {
  return Platform.OS !== 'web' && Boolean(NativeModules.RNGoogleSignin);
}

/**
 * An iOS-type OAuth client cannot return to Expo Go: the reversed client-id
 * scheme is not in Expo Go's Info.plist, and the Expo auth proxy is a web
 * redirect. A development build (`npx expo run:ios`) registers the scheme.
 */
export function googleNeedsDevelopmentBuild(): boolean {
  return Platform.OS === 'ios' && isExpoGo() && !GOOGLE_WEB_CLIENT_ID;
}

export function isGoogleConfigured(): boolean {
  return Boolean(googleClientIdForPlatform()) && !googleNeedsDevelopmentBuild();
}

/**
 * Native Google Sign-In sheet when the module is linked (dev/prod iOS builds).
 * AuthSession is the fallback when the native module is absent but the reversed
 * URL scheme is registered. Expo Go cannot complete either path with an iOS
 * client — `isGoogleConfigured()` is false there until a web client exists.
 */
export async function requestGoogleIdentityToken(): Promise<{
  identityToken: string;
  nonce?: string;
}> {
  if (googleNeedsDevelopmentBuild() || !googleClientIdForPlatform()) {
    throw new AuthNotConfiguredError('google');
  }

  const native = await requestNativeGoogleIdentityToken();
  if (native) return native;

  return requestAuthSessionGoogleIdentityToken();
}

async function requestNativeGoogleIdentityToken(): Promise<{
  identityToken: string;
} | null> {
  if (!nativeGoogleModulePresent()) return null;

  try {
    const { GoogleSignin, isCancelledResponse, isSuccessResponse } = await import(
      '@react-native-google-signin/google-signin'
    );

    GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      // Only a web client is a valid `serverClientID`. Passing the iOS id here
      // makes Google mint a token whose `aud` the API would not expect. Omit it
      // until we have one — iOS still returns an ID token for the iOS client.
      ...(GOOGLE_WEB_CLIENT_ID ? { webClientId: GOOGLE_WEB_CLIENT_ID } : {}),
      scopes: ['openid', 'profile', 'email'],
    });

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) throw new AuthCanceledError();
    if (!isSuccessResponse(response)) {
      throw new Error('Google sign-in did not return an identity token');
    }

    const identityToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
    if (!identityToken) {
      throw new Error('Google sign-in did not return an identity token');
    }

    return { identityToken };
  } catch (error) {
    if (error instanceof AuthCanceledError) throw error;

    const message = error instanceof Error ? error.message : String(error);
    if (/RNGoogleSignin|TurboModule|native module is null/i.test(message)) {
      return null;
    }

    throw error;
  }
}

async function requestAuthSessionGoogleIdentityToken(): Promise<{
  identityToken: string;
  nonce: string;
}> {
  const clientId = googleClientIdForPlatform();
  const nonce = await createNonce();
  const redirectUri = googleRedirectUri();

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

function googleRedirectUri(): string {
  // iOS OAuth clients return to the reversed client-id scheme, not aura://.
  if (Platform.OS === 'ios' && !isExpoGo()) {
    return `${GOOGLE_IOS_URL_SCHEME}:/oauth2redirect/google`;
  }

  return AuthSession.makeRedirectUri({ scheme: 'aura', path: 'oauth' });
}
