import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { decodeCursor } from '../feed/cursor';

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
  commentCount?: number;
}) {
  const returningUpdate = vi.fn().mockResolvedValue([{ commentCount: options.commentCount ?? 1 }]);

  const tx = {
    insert: vi.fn(() => ({
      values: vi.fn((values: { body: string; postId: string; authorId: string }) => ({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'c_1',
            postId: values.postId,
            authorId: values.authorId,
            body: values.body,
            createdAt: new Date('2026-08-30T12:00:00.000Z'),
          },
        ]),
      })),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: returningUpdate })) })) })),
  };

  return {
    query: {
      posts: {
        findFirst: vi.fn().mockResolvedValue(options.post),
      },
    },
    transaction: vi.fn((fn: (inner: typeof tx) => unknown) => fn(tx)),
    tx,
    returningUpdate,
  };
}

function commentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c_1',
    body: 'first',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    authorId: 'u_bob',
    username: 'bob',
    displayName: 'Bob',
    avatarUrl: null,
    authorAura: 40,
    authorTitle: 'Aura Enjoyer',
    ...overrides,
  };
}

function createListDb(options: {
  post?: Record<string, unknown> | undefined;
  rows?: Record<string, unknown>[];
}) {
  const limit = vi.fn().mockResolvedValue(options.rows ?? []);
  return {
    query: {
      posts: {
        findFirst: vi.fn().mockResolvedValue(options.post),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({ limit })),
          })),
        })),
      })),
    })),
    limit,
  };
}

describe('CommentsService.create', () => {
  const env = { JWT_SECRET: 'test-secret-at-least-32-characters-long' };
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

describe('CommentsService.list', () => {
  const env = { JWT_SECRET: 'test-secret-at-least-32-characters-long' };

  it('returns the thread in the order the query produced', async () => {
    const rows = [
      commentRow(),
      commentRow({
        id: 'c_2',
        body: 'second',
        createdAt: new Date('2026-08-30T12:01:00.000Z'),
        authorId: 'u_alice',
        username: 'alice',
        displayName: 'Alice',
        authorAura: 100,
        authorTitle: 'Aura Farmer',
      }),
    ];
    const db = createListDb({ post: published, rows });
    const safety = { hiddenAuthorIds: vi.fn().mockResolvedValue(new Set()) };
    const service = new CommentsService(db as never, env as never, safety as never);

    const page = await service.list('post_1', { limit: 20 });

    expect(page.items.map((item) => item.body)).toEqual(['first', 'second']);
    expect(page.items[1]?.author).toEqual({
      id: 'u_alice',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      aura: 100,
      title: 'Aura Farmer',
    });
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect(safety.hiddenAuthorIds).not.toHaveBeenCalled();
  });

  it('pages when another comment exists after this slice', async () => {
    const rows = [
      commentRow({ id: 'c_1', createdAt: new Date('2026-08-30T12:00:00.000Z') }),
      commentRow({ id: 'c_2', body: 'second', createdAt: new Date('2026-08-30T12:01:00.000Z') }),
      commentRow({ id: 'c_3', body: 'third', createdAt: new Date('2026-08-30T12:02:00.000Z') }),
    ];
    const db = createListDb({ post: published, rows });
    const service = new CommentsService(
      db as never,
      env as never,
      { hiddenAuthorIds: vi.fn() } as never,
    );

    const page = await service.list('post_1', { limit: 2 });

    expect(page.items.map((item) => item.id)).toEqual(['c_1', 'c_2']);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBeTruthy();
    expect(decodeCursor(page.nextCursor!, env.JWT_SECRET)).toEqual({
      value: new Date('2026-08-30T12:01:00.000Z').getTime(),
      id: 'c_2',
    });
    expect(db.limit).toHaveBeenCalledWith(3);
  });

  it('asks safety which authors to hide when the viewer is signed in', async () => {
    const db = createListDb({ post: published, rows: [commentRow()] });
    const safety = { hiddenAuthorIds: vi.fn().mockResolvedValue(new Set(['u_blocked'])) };
    const service = new CommentsService(db as never, env as never, safety as never);

    await service.list('post_1', { limit: 20, viewerId: 'u_alice' });

    expect(safety.hiddenAuthorIds).toHaveBeenCalledWith('u_alice');
  });

  it('refuses a missing post before reading comments', async () => {
    const db = createListDb({ post: undefined });
    const service = new CommentsService(
      db as never,
      env as never,
      { hiddenAuthorIds: vi.fn() } as never,
    );

    await expect(service.list('missing', { limit: 20 })).rejects.toBeInstanceOf(AppError);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('refuses an unpublished post before reading comments', async () => {
    const db = createListDb({ post: { ...published, status: 'processing' } });
    const service = new CommentsService(
      db as never,
      env as never,
      { hiddenAuthorIds: vi.fn() } as never,
    );

    await expect(service.list('post_1', { limit: 20 })).rejects.toMatchObject({
      code: ErrorCode.POST_NOT_PUBLISHED,
    });
    expect(db.select).not.toHaveBeenCalled();
  });
});
