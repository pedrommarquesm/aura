/**
 * Stand-in content for the Discover surface. Challenges and battles are V1
 * (roadmap `API-32`, `API-33`); the tiles exist so the shell reads as the product
 * instead of an empty tab.
 */
export type ChallengePrompt = {
  id: string;
  title: string;
  entries: number;
  endsInHours: number;
};

export const mockChallenges: ChallengePrompt[] = [
  { id: 'ch-1', title: 'Absolute Cinema', entries: 2_140, endsInHours: 9 },
  { id: 'ch-2', title: 'Biggest Flex', entries: 1_302, endsInHours: 21 },
  { id: 'ch-3', title: 'Coldest Aura', entries: 884, endsInHours: 33 },
];

export const mockTrendingTiles = [
  { id: 't-1', seed: 'trend-01', aura: 12_840 },
  { id: 't-2', seed: 'trend-02', aura: 9_420 },
  { id: 't-3', seed: 'trend-03', aura: 6_110 },
  { id: 't-4', seed: 'trend-04', aura: 4_902 },
  { id: 't-5', seed: 'trend-05', aura: 3_301 },
  { id: 't-6', seed: 'trend-06', aura: 2_330 },
];
