import { useEffect } from 'react';

import { subscribeFeedTabPress } from './feed-tab';

/**
 * Bottom-tab tap on Feed should jump the list back to the first post —
 * same as Instagram / TikTok. The tab layout emits; the list subscribes.
 */
export function useScrollToTopOnTabPress(scrollToTop: () => void) {
  useEffect(() => subscribeFeedTabPress(scrollToTop), [scrollToTop]);
}
