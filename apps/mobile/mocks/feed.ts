import type { FeedCard } from '@/lib/api';

/**
 * Local stand-in for `GET /feed`. Discover and Profile still read from here;
 * Home and Rank hit the live API.
 */

const photo = (seed: string, width: number, height: number) => ({
  type: 'photo' as const,
  thumbUrl: `https://picsum.photos/seed/${seed}/64/${Math.round((64 * height) / width)}`,
  feedUrl: `https://picsum.photos/seed/${seed}/${width}/${height}`,
  width,
  height,
});

const avatar = (seed: string) => `https://picsum.photos/seed/${seed}-face/96/96`;

export const mockViewer = {
  username: 'you',
  avatarUrl: avatar('viewer'),
  aura: 8_421,
  rank: 47,
  title: 'Aura Farmer',
};

export const mockFeed: FeedCard[] = [
  {
    id: '01j0000000000000000000001',
    author: {
      id: 'u-alice',
      username: 'alice',
      avatarUrl: avatar('alice'),
      aura: 82_421,
      title: 'Aura Lord',
    },
    media: photo('aura-01', 1080, 1350),
    caption: 'golden hour hits different when you are winning',
    likeCount: 1_284,
    aura: 12_840,
    likedByMe: false,
    createdAt: '2026-08-28T09:12:00.000Z',
  },
  {
    id: '01j0000000000000000000002',
    author: {
      id: 'u-joao',
      username: 'joao',
      avatarUrl: avatar('joao'),
      aura: 79_301,
      title: 'Aura Lord',
    },
    media: {
      type: 'video',
      thumbUrl: `https://picsum.photos/seed/aura-02/64/80`,
      feedUrl: `https://picsum.photos/seed/aura-02/1080/1350`,
      hlsUrl: 'https://cdn.aura.app/placeholder/manifest.m3u8',
      width: 1080,
      height: 1350,
      durationMs: 7_400,
    },
    caption: 'absolute cinema',
    likeCount: 942,
    aura: 9_420,
    likedByMe: true,
    createdAt: '2026-08-28T08:44:00.000Z',
  },
  {
    id: '01j0000000000000000000003',
    author: {
      id: 'u-maria',
      username: 'maria',
      avatarUrl: avatar('maria'),
      aura: 72_120,
      title: 'Aura Merchant',
    },
    media: photo('aura-03', 1080, 1080),
    caption: 'unbothered. moisturised. climbing.',
    likeCount: 611,
    aura: 6_110,
    likedByMe: false,
    createdAt: '2026-08-28T07:58:00.000Z',
  },
  {
    id: '01j0000000000000000000004',
    author: {
      id: 'u-tomas',
      username: 'tomas',
      avatarUrl: avatar('tomas'),
      aura: 18_902,
      title: 'Aura Merchant',
    },
    media: photo('aura-04', 1080, 1350),
    caption: 'day 6 of posting until I hit top 100',
    likeCount: 233,
    aura: 2_330,
    likedByMe: false,
    createdAt: '2026-08-28T06:31:00.000Z',
  },
  {
    id: '01j0000000000000000000005',
    author: {
      id: 'u-ines',
      username: 'ines',
      avatarUrl: avatar('ines'),
      aura: 4_204,
      title: 'Aura Farmer',
    },
    media: photo('aura-05', 1080, 1440),
    caption: 'coldest aura in Lisbon, no notes',
    likeCount: 87,
    aura: 870,
    likedByMe: false,
    createdAt: '2026-08-28T05:04:00.000Z',
  },
  {
    id: '01j0000000000000000000006',
    author: {
      id: 'u-rui',
      username: 'rui',
      avatarUrl: null,
      aura: 640,
      title: 'Aura Enjoyer',
    },
    media: photo('aura-06', 1080, 1080),
    caption: 'first post, be gentle',
    likeCount: 12,
    aura: 120,
    likedByMe: false,
    createdAt: '2026-08-28T04:20:00.000Z',
  },
];
