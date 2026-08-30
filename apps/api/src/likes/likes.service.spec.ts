import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Likes used to skip Redis entirely. A later delete then ZINCRBY'd a cold
 * set and the board collapsed to one row. Both writes must hit applyDelta.
 */
describe('LikesService leaderboard writes', () => {
  const source = readFileSync('src/likes/likes.service.ts', 'utf8');

  it('projects a like onto lb:global', () => {
    expect(source).toContain('this.leaderboard.applyDelta(post.authorId, amount)');
  });

  it('projects an unlike onto lb:global', () => {
    expect(source).toContain('this.leaderboard.applyDelta(post.authorId, -originalAmount)');
  });
});
