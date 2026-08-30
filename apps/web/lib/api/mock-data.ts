import { auraTitle } from "@/lib/aura";

import type { FeedCard, LeaderboardEntry, Post, PostAuthor } from "./types";

function author(username: string, aura: number): PostAuthor {
  return { username, aura, title: auraTitle(aura), avatarUrl: null };
}

/** Vector posters stand in for CDN media when the mock API is on. */
function media(
  poster: number,
  overrides: Partial<Post["media"]> = {},
): Post["media"] {
  const url = `/mock/post-0${poster}.svg`;
  return {
    type: "photo",
    feedUrl: url,
    thumbUrl: url,
    width: 1080,
    height: 1350,
    ...overrides,
  };
}

/** V0 pays a flat 10 Aura per like (architecture §7.4). */
function auraFor(likeCount: number) {
  return likeCount * 10;
}

export const mockPosts: Post[] = [
  {
    id: "01jbq7c9nk0000000000000001",
    createdAt: "2026-08-28T17:42:00.000Z",
    author: author("mafalda", 128_940),
    media: media(1),
    caption: "golden hour did most of the work",
    likeCount: 18_402,
    commentCount: 0,
    aura: auraFor(18_402),
    likedByMe: false,
  },
  {
    id: "01jbq7c9nk0000000000000002",
    createdAt: "2026-08-28T16:05:00.000Z",
    author: author("tiago", 74_210),
    media: media(2, { type: "video", durationMs: 7_400 }),
    caption: "absolute cinema",
    likeCount: 12_884,
    commentCount: 0,
    aura: auraFor(12_884),
    likedByMe: false,
  },
  {
    id: "01jbq7c9nk0000000000000003",
    createdAt: "2026-08-28T14:20:00.000Z",
    author: author("ines", 41_330),
    media: media(3),
    caption: "lisbon at 2am is undefeated",
    likeCount: 9_117,
    commentCount: 0,
    aura: auraFor(9_117),
    likedByMe: false,
  },
  {
    id: "01jbq7c9nk0000000000000004",
    createdAt: "2026-08-28T12:58:00.000Z",
    author: author("rui", 22_845),
    media: media(4),
    caption: "swam out until the city disappeared",
    likeCount: 6_530,
    commentCount: 0,
    aura: auraFor(6_530),
    likedByMe: false,
  },
  {
    id: "01jbq7c9nk0000000000000005",
    createdAt: "2026-08-28T11:12:00.000Z",
    author: author("kaya", 15_602),
    media: media(5, { type: "video", durationMs: 5_100 }),
    caption: "unbothered, moisturised, on the leaderboard",
    likeCount: 5_284,
    commentCount: 0,
    aura: auraFor(5_284),
    likedByMe: false,
  },
  {
    id: "01jbq7c9nk0000000000000006",
    createdAt: "2026-08-28T09:44:00.000Z",
    author: author("bruno", 8_940),
    media: media(6),
    caption: "last shot of the night, obviously",
    likeCount: 3_902,
    commentCount: 0,
    aura: auraFor(3_902),
    likedByMe: false,
  },
];

export const mockTrendingFeed: FeedCard[] = mockPosts;

const LEADERBOARD: ReadonlyArray<[username: string, aura: number]> = [
  ["mafalda", 128_940],
  ["joao", 121_508],
  ["tiago", 74_210],
  ["carolina", 68_774],
  ["ines", 41_330],
  ["rui", 22_845],
  ["kaya", 15_602],
  ["duarte", 12_066],
  ["bruno", 8_940],
  ["sofia", 6_215],
  ["nuno", 4_803],
  ["marta", 2_190],
];

export const mockLeaderboard: LeaderboardEntry[] = LEADERBOARD.map(
  ([username, aura], index) => ({
    rank: index + 1,
    userId: `mock-${username}`,
    username,
    displayName: username,
    avatarUrl: null,
    aura,
    title: auraTitle(aura),
  }),
);
