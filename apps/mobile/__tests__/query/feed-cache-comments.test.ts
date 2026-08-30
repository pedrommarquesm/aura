import { QueryClient } from '@tanstack/react-query';

import { applyCreatedComment } from '@/lib/query/feed-cache';
import { queryKeys } from '@/lib/query/keys';
import { mockFeed } from '@/mocks/feed';

import { createdComment, feedPage } from '../helpers/api';

describe('applyCreatedComment', () => {
  it('writes the new count onto the feed, the permalink, and the thread', () => {
    const post = mockFeed[0]!;
    const client = new QueryClient();
    client.setQueryData(queryKeys.feed.ranking('latest'), {
      pages: [feedPage([{ ...post, commentCount: 0 }])],
      pageParams: [null],
    });
    client.setQueryData(queryKeys.post(post.id), { ...post, status: 'published', commentCount: 0 });

    applyCreatedComment(client, post.id, createdComment('absolute cinema', 3));

    const feed = client.getQueryData<{
      pages: { items: { id: string; commentCount: number }[] }[];
    }>(queryKeys.feed.ranking('latest'));
    expect(feed?.pages[0]?.items[0]?.commentCount).toBe(3);

    const detail = client.getQueryData<{ commentCount: number }>(queryKeys.post(post.id));
    expect(detail?.commentCount).toBe(3);

    const thread = client.getQueryData<{
      pages: { items: { body: string }[] }[];
    }>(queryKeys.postComments(post.id));
    expect(thread?.pages[0]?.items.map((item) => item.body)).toEqual(['absolute cinema']);
  });
});
