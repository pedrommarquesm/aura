import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../common/errors/app-error';

import { PostsService } from './posts.service';

function createDb(post: Record<string, unknown> | undefined) {
  const set = vi.fn(() => ({
    where: vi.fn().mockResolvedValue(undefined),
  }));
  const insertValues = vi.fn().mockResolvedValue(undefined);
  return {
    query: {
      posts: {
        findFirst: vi.fn().mockResolvedValue(post),
      },
    },
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
    insert: vi.fn(() => ({ values: insertValues })),
    set,
    insertValues,
  };
}

describe('PostsService.updateCaption', () => {
  const card = {
    id: 'post_1',
    caption: 'edited',
    author: { id: 'u_alice' },
  };

  it('writes the caption when the actor owns the post', async () => {
    const db = createDb({ id: 'post_1', authorId: 'u_alice', status: 'published' });
    const feed = { getPost: vi.fn().mockResolvedValue({ card, authorId: 'u_alice', status: 'published' }) };
    const service = new PostsService(db as never, feed as never);

    const result = await service.updateCaption('u_alice', 'post_1', '  edited  ');

    expect(result.caption).toBe('edited');
    expect(db.set).toHaveBeenCalledWith({ caption: 'edited' });
  });

  it('reindexes hashtags when the caption changes', async () => {
    const db = createDb({ id: 'post_1', authorId: 'u_alice', status: 'published' });
    const feed = {
      getPost: vi.fn().mockResolvedValue({
        card: { ...card, caption: 'gold #Aura' },
        authorId: 'u_alice',
        status: 'published',
      }),
    };
    const service = new PostsService(db as never, feed as never);

    await service.updateCaption('u_alice', 'post_1', 'gold #Aura');

    expect(db.delete).toHaveBeenCalled();
    expect(db.insertValues).toHaveBeenCalledWith([{ postId: 'post_1', tag: 'aura' }]);
  });

  it('stores no caption when the description is blank', async () => {
    const db = createDb({ id: 'post_1', authorId: 'u_alice', status: 'published' });
    const feed = {
      getPost: vi.fn().mockResolvedValue({ card: { ...card, caption: null }, authorId: 'u_alice', status: 'published' }),
    };
    const service = new PostsService(db as never, feed as never);

    await service.updateCaption('u_alice', 'post_1', '   ');

    expect(db.set).toHaveBeenCalledWith({ caption: null });
  });

  it('refuses anyone who is not the author', async () => {
    const db = createDb({ id: 'post_1', authorId: 'u_alice', status: 'published' });
    const service = new PostsService(db as never, { getPost: vi.fn() } as never);

    await expect(service.updateCaption('u_bob', 'post_1', 'nope')).rejects.toBeInstanceOf(AppError);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('hides a removed post instead of editing it', async () => {
    const db = createDb({ id: 'post_1', authorId: 'u_alice', status: 'removed' });
    const service = new PostsService(db as never, { getPost: vi.fn() } as never);

    await expect(service.updateCaption('u_alice', 'post_1', 'nope')).rejects.toBeInstanceOf(AppError);
    expect(db.update).not.toHaveBeenCalled();
  });
});
