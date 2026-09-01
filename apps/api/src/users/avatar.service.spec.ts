import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { avatarKey } from '../media/media-keys';
import { MediaUrlResolver } from '../media/media-url.resolver';
import { MemoryObjectStore } from '../media/memory.object-store';

import { AvatarService } from './avatar.service';

const actor = {
  id: 'u_alice',
  username: 'alice',
  displayName: null,
  avatarUrl: null,
  aura: 10,
  title: null,
  locale: 'en',
};

function env() {
  return {
    MEDIA_UPLOAD_TTL_SECONDS: 900,
    MEDIA_AVATAR_MAX_BYTES: 2 * 1024 * 1024,
    MEDIA_CDN_BASE_URL: 'https://cdn.auraclimb.com',
    MEDIA_EDGE: 'none',
  } as never;
}

function resolver() {
  return new MediaUrlResolver({
    MEDIA_CDN_BASE_URL: 'https://cdn.auraclimb.com',
    MEDIA_EDGE: 'none',
  } as never);
}

function createDb(user = actor) {
  const returning = vi.fn();
  const set = vi.fn(() => ({
    where: vi.fn(() => ({ returning })),
  }));
  return {
    user,
    set,
    returning,
    update: vi.fn(() => ({ set })),
  };
}

describe('AvatarService', () => {
  it('presigns a JPEG under avatars/{userId}/{uploadId}.jpg', async () => {
    const store = new MemoryObjectStore();
    const db = createDb();
    const service = new AvatarService(db as never, env(), store, resolver());

    const result = await service.create(actor as never, {
      contentType: 'image/jpeg',
      byteSize: 80_000,
      width: 720,
      height: 720,
    });

    expect(result.method).toBe('PUT');
    expect(result.maxBytes).toBe(80_000);
    expect(result.uploadUrl).toContain(`avatars/${actor.id}/`);
    expect(result.uploadUrl).toMatch(/\.jpg$/);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects a video and an oversized file before presign', async () => {
    const store = new MemoryObjectStore();
    const service = new AvatarService(createDb() as never, env(), store, resolver());

    await expect(
      service.create(actor as never, { contentType: 'video/mp4', byteSize: 1_000 }),
    ).rejects.toMatchObject({ code: ErrorCode.UNSUPPORTED_MEDIA_TYPE });

    await expect(
      service.create(actor as never, { contentType: 'image/png', byteSize: 1_000 }),
    ).rejects.toMatchObject({ code: ErrorCode.UNSUPPORTED_MEDIA_TYPE });

    await expect(
      service.create(actor as never, { contentType: 'image/jpeg', byteSize: 3 * 1024 * 1024 }),
    ).rejects.toMatchObject({ code: ErrorCode.UPLOAD_TOO_LARGE });
  });

  it('writes the CDN URL after the object lands', async () => {
    const store = new MemoryObjectStore();
    const db = createDb();
    const service = new AvatarService(db as never, env(), store, resolver());

    const created = await service.create(actor as never, {
      contentType: 'image/jpeg',
      byteSize: 40,
    });

    const key = avatarKey(actor.id, created.uploadId, 'jpg');
    await store.put(key, Buffer.alloc(40), { contentType: 'image/jpeg' });

    const next = { ...actor, avatarUrl: `https://cdn.auraclimb.com/${key}` };
    db.returning.mockResolvedValue([next]);

    const result = await service.complete(actor as never, { uploadId: created.uploadId });

    expect(result.user.avatarUrl).toBe(`https://cdn.auraclimb.com/${key}`);
    expect(db.set).toHaveBeenCalledWith(
      expect.objectContaining({ avatarUrl: `https://cdn.auraclimb.com/${key}` }),
    );
  });

  it('refuses complete when nothing was uploaded', async () => {
    const store = new MemoryObjectStore();
    const service = new AvatarService(createDb() as never, env(), store, resolver());

    await expect(service.complete(actor as never, { uploadId: 'missing' })).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(service.complete(actor as never, { uploadId: 'missing' })).rejects.toMatchObject({
      code: ErrorCode.UPLOAD_EXPIRED,
    });
  });
});
