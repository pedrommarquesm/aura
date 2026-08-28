import { create } from 'zustand';

import type { FeedRanking } from '@/lib/api';

type PreferencesState = {
  feedRanking: FeedRanking;
  /** Videos autoplay muted in the viewport (§8). Users on metered data can opt out. */
  autoplayVideo: boolean;
  hapticsEnabled: boolean;
  setFeedRanking: (ranking: FeedRanking) => void;
  setAutoplayVideo: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
};

/**
 * In memory for now. These want to survive a restart, but persistence means picking a
 * storage adapter and that decision belongs with `FND-06`, not with the scaffold.
 */
export const usePreferencesStore = create<PreferencesState>((set) => ({
  feedRanking: 'latest',
  autoplayVideo: true,
  hapticsEnabled: true,
  setFeedRanking: (feedRanking) => set({ feedRanking }),
  setAutoplayVideo: (autoplayVideo) => set({ autoplayVideo }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
}));
