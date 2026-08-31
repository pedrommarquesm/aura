import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../common/errors/app-error';

import { HashtagsController } from './hashtags.controller';

describe('HashtagsController.list', () => {
  it('asks the latest feed for the normalized tag', async () => {
    const page = { items: [], nextCursor: null, hasMore: false };
    const feed = { getFeed: vi.fn().mockResolvedValue(page) };
    const controller = new HashtagsController(feed as never);

    const result = await controller.list('Sunset', {}, { user: { id: 'u_alice' } } as never);

    expect(result).toBe(page);
    expect(feed.getFeed).toHaveBeenCalledWith({
      kind: 'latest',
      cursor: undefined,
      limit: 10,
      viewerId: 'u_alice',
      hashtag: 'sunset',
    });
  });

  it('rejects an illegal tag before touching the feed', async () => {
    const feed = { getFeed: vi.fn() };
    const controller = new HashtagsController(feed as never);

    await expect(controller.list('!!!', {}, {} as never)).rejects.toBeInstanceOf(AppError);
    expect(feed.getFeed).not.toHaveBeenCalled();
  });
});
