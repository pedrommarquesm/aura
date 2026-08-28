/**
 * Stand-in for `GET /leaderboards/global` (roadmap `AURA-05`), which returns the top
 * rows plus the viewer's own rank so it can be pinned even outside the top 100 (§15).
 */
export type LeaderboardRow = {
  rank: number;
  username: string;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
};

const avatar = (seed: string) => `https://picsum.photos/seed/${seed}-face/96/96`;

export const mockLeaderboard: LeaderboardRow[] = [
  { rank: 1, username: 'alice', avatarUrl: avatar('alice'), aura: 82_421, title: 'Aura Lord' },
  { rank: 2, username: 'joao', avatarUrl: avatar('joao'), aura: 79_301, title: 'Aura Lord' },
  { rank: 3, username: 'maria', avatarUrl: avatar('maria'), aura: 72_120, title: 'Aura Merchant' },
  { rank: 4, username: 'sofia', avatarUrl: avatar('sofia'), aura: 51_004, title: 'Aura Lord' },
  { rank: 5, username: 'diogo', avatarUrl: avatar('diogo'), aura: 44_870, title: 'Aura Merchant' },
  { rank: 6, username: 'lena', avatarUrl: avatar('lena'), aura: 39_912, title: 'Aura Merchant' },
  { rank: 7, username: 'tomas', avatarUrl: avatar('tomas'), aura: 18_902, title: 'Aura Merchant' },
];
