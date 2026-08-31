import { describe, expect, it, vi } from 'vitest';

import { replacePostHashtags } from './hashtag-index';

function createDb() {
  const delWhere = vi.fn().mockResolvedValue(undefined);
  const insertValues = vi.fn().mockResolvedValue(undefined);
  return {
    delete: vi.fn(() => ({ where: delWhere })),
    insert: vi.fn(() => ({ values: insertValues })),
    delWhere,
    insertValues,
  };
}

describe('replacePostHashtags', () => {
  it('clears previous rows and writes unique tags', async () => {
    const db = createDb();

    await replacePostHashtags(db as never, 'post_1', 'gold #Aura #aura #sunset');

    expect(db.delete).toHaveBeenCalled();
    expect(db.delWhere).toHaveBeenCalled();
    expect(db.insertValues).toHaveBeenCalledWith([
      { postId: 'post_1', tag: 'aura' },
      { postId: 'post_1', tag: 'sunset' },
    ]);
  });

  it('only deletes when the caption has no tags', async () => {
    const db = createDb();

    await replacePostHashtags(db as never, 'post_1', 'plain words');

    expect(db.delWhere).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
