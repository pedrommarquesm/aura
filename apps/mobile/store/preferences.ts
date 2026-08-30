import { create } from 'zustand';

import type { FeedRanking } from '@/lib/api';
import type { AppLocale } from '@/lib/i18n/locales';

type PreferencesState = {
  feedRanking: FeedRanking;
  /** Videos autoplay muted in the viewport (§8). Users on metered data can opt out. */
  autoplayVideo: boolean;
  /**
   * One mute switch for the whole feed. Unmuting a post keeps sound on for the
   * next ones; muting again silences the rest of the session.
   */
  feedMuted: boolean;
  hapticsEnabled: boolean;
  /**
   * Explicit language choice, which wins over the device locale. `null` means follow
   * the device — the state a first launch starts in.
   */
  languageOverride: AppLocale | null;
  setFeedRanking: (ranking: FeedRanking) => void;
  setAutoplayVideo: (enabled: boolean) => void;
  setFeedMuted: (muted: boolean) => void;
  toggleFeedMuted: () => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setLanguageOverride: (locale: AppLocale | null) => void;
};

/**
 * In memory for now. These want to survive a restart, but persistence means picking a
 * storage adapter and that decision belongs with `FND-06`, not with the scaffold.
 *
 * `languageOverride` is the one that will be missed most: today a relaunch falls back to
 * the device locale. It is deliberately not going into SecureStore to get around that —
 * the Keychain is for secrets, not for a display preference, and it would make the
 * choice unreadable on the web build.
 */
export const usePreferencesStore = create<PreferencesState>((set) => ({
  feedRanking: 'latest',
  autoplayVideo: true,
  feedMuted: true,
  hapticsEnabled: true,
  languageOverride: null,
  setFeedRanking: (feedRanking) => set({ feedRanking }),
  setAutoplayVideo: (autoplayVideo) => set({ autoplayVideo }),
  setFeedMuted: (feedMuted) => set({ feedMuted }),
  toggleFeedMuted: () => set((state) => ({ feedMuted: !state.feedMuted })),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
  setLanguageOverride: (languageOverride) => set({ languageOverride }),
}));
