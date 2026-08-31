import type { FeedRanking } from '@/lib/api';

/** Card lists that like / caption / avatar writes must stay in sync. */
export function isInfiniteCardQuery(queryKey: readonly unknown[]) {
  return (
    queryKey[0] === 'feed' ||
    (queryKey[0] === 'user' && queryKey[2] === 'posts') ||
    queryKey[0] === 'hashtag'
  );
}

/**
 * Every query key in the app is built here so invalidation stays greppable.
 * Keys are hierarchical: invalidating `feed.all` drops every ranking.
 */
export const queryKeys = {
  feed: {
    all: ['feed'] as const,
    ranking: (ranking: FeedRanking, viewer: string = 'guest') =>
      ['feed', ranking, viewer] as const,
  },
  me: ['me'] as const,
  user: (username: string) => ['user', username] as const,
  userPosts: (userId: string) => ['user', userId, 'posts'] as const,
  hashtag: (tag: string) => ['hashtag', tag] as const,
  post: (id: string) => ['post', id] as const,
  postComments: (id: string) => ['post', id, 'comments'] as const,
  leaderboard: {
    global: ['leaderboard', 'global'] as const,
  },
};
