/**
 * Google OAuth client ids. These are public — they ship in the app binary.
 * The API must list the same values in `GOOGLE_CLIENT_IDS` so it accepts the
 * identity token's `aud`.
 *
 * Env vars override the baked-in iOS id if a later Android/web client lands.
 */
import { Platform } from 'react-native';

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
  '37586478648-lje8e40652sgi8pl7hmogjd7ns6qmj5f.apps.googleusercontent.com';

/** Reversed iOS client id. Google's native SDK returns to this URL scheme. */
export const GOOGLE_IOS_URL_SCHEME = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(
  '.apps.googleusercontent.com',
  '',
)}`;

export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

export function googleClientIdForPlatform(): string {
  if (Platform.OS === 'android') {
    return GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || '';
  }
  if (Platform.OS === 'web') {
    return GOOGLE_WEB_CLIENT_ID || '';
  }
  return GOOGLE_IOS_CLIENT_ID;
}
