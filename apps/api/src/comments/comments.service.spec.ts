import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

import { CommentsService } from './comments.service';

const actor = {
  id: 'u_alice',
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  aura: 100,
  title: 'Aura Farmer',
};

const published = { id: 'post_1', authorId: 'u_bob', status: 'published' };

function createDb(options: {
  post?: Record<string, unknown> | undefined;
  inserted?: Record<string, unknown>;
  commentCount?: number;
}) {
  const returningInsert = vi.fn().mockResolvedValue([
    options.inserted ?? {
      id: 'c_1',
      postId: 'post_1',
      authorId: actor.id,
      body: 'nice shot',
      createdAt: new Date('2026-08-30T12:00:00.000Z'),
    },
  ]);
  const returningUpdate = vi.fn().mockResolvedValue([{ commentCount: options.commentCount ?? 1 }]);

  const tx = {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: returningInsert })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: returningUpdate })) })) })),
  };

  return {
    query: {
      posts: {
        findFirst: vi.fn().mockResolvedValue(options.post),
      },
    },
    transaction: vi.fn(async (fn: (inner: typeof tx) => unknown) => fn(tx)),
    tx,
    returningInsert,
    returningUpdate,
  };
}

describe('CommentsService.create', () => {
  const env = { JWT_SECRET: 'test-secret' };
  const safety = { hiddenAuthorIds: vi.fn().mockResolvedValue(new Set()) };

  it('lets the post author comment on their own post', async () => {
    const db = createDb({ post: { ...published, authorId: actor.id } });
    const service = new CommentsService(db as never, env as never, safety as never);

    const result = await service.create(actor as never, 'post_1', '  own take  ');

    expect(result.comment.body).toBe('own take');
    expect(result.comment.author.id).toBe(actor.id);
    expect(result.commentCount).toBe(1);
    expect(db.transaction).toHaveBeenCalled();
  });

  it('lets someone else comment on a published post', async () => {
    const db = createDb({ post: published, commentCount: 4 });
    const service = new CommentsService(db as never, env as never, safety as never);

    const result = await service.create(actor as never, 'post_1', 'fire');

    expect(result.comment.body).toBe('fire');
    expect(result.commentCount).toBe(4);
  });

  it('refuses a missing post', async () => {
    const db = createDb({ post: undefined });
    const service = new CommentsService(db as never, env as never, safety as never);

    await expect(service.create(actor as never, 'missing', 'hi')).rejects.toBeInstanceOf(AppError);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('refuses an unpublished post', async () => {
    const db = createDb({ post: { ...published, status: 'processing' } });
    const service = new CommentsService(db as never, env as never, safety as never);

    await expect(service.create(actor as never, 'post_1', 'hi')).rejects.toMatchObject({
      code: ErrorCode.POST_NOT_PUBLISHED,
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('refuses a blank body before writing', async () => {
    const db = createDb({ post: published });
    const service = new CommentsService(db as never, env as never, safety as never);

    await expect(service.create(actor as never, 'post_1', '   ')).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
