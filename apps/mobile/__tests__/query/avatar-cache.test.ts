import { applyAvatarUrl } from '@/lib/query/avatar-cache';
import { queryKeys } from '@/lib/query/keys';
import { mockFeed } from '@/mocks/feed';

import { createdComment, feedPage, testUser } from '../helpers/api';
import { createTestQueryClient } from '../helpers/query-client';

describe('applyAvatarUrl', () => {
  it('updates the author on the permalink and leaves the comment thread alone', () => {
    const post = { ...mockFeed[0]!, author: { ...mockFeed[0]!.author, id: testUser.id } };
    const nextUrl = 'https://cdn.aurarankd.com/avatars/u-tester/new.jpg';
    const client = createTestQueryClient();
    const thread = {
      pages: [{ items: [createdComment('keep me', 1).comment], nextCursor: null, hasMore: false }],
      pageParams: [null],
    };

    client.setQueryData(queryKeys.feed.ranking('latest'), {
      pages: [feedPage([post])],
      pageParams: [null],
    });
    client.setQueryData(queryKeys.post(post.id), { ...post, status: 'published' });
    client.setQueryData(queryKeys.postComments(post.id), thread);

    expect(() =>
      applyAvatarUrl(client, { userId: testUser.id, username: testUser.username, avatarUrl: nextUrl }),
    ).not.toThrow();

    const detail = client.getQueryData<{ author: { avatarUrl: string | null } }>(
      queryKeys.post(post.id),
    );
    expect(detail?.author.avatarUrl).toBe(nextUrl);

    const feed = client.getQueryData<{
      pages: { items: { author: { avatarUrl: string | null } }[] }[];
    }>(queryKeys.feed.ranking('latest'));
    expect(feed?.pages[0]?.items[0]?.author.avatarUrl).toBe(nextUrl);

    expect(client.getQueryData(queryKeys.postComments(post.id))).toEqual(thread);
  });
});
