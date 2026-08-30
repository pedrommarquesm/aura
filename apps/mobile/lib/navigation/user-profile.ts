import type { Href } from 'expo-router';

/**
 * Own identity stays on the Profile tab. Everyone else is a stack screen
 * so a feed tap can push and back lands on the post you came from.
 */
export function userProfileHref(username: string, viewerUsername?: string | null): Href {
  if (viewerUsername && viewerUsername.toLowerCase() === username.toLowerCase()) {
    return '/(tabs)/profile';
  }
  return `/user/${encodeURIComponent(username)}` as Href;
}
