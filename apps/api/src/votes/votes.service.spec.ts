import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * A vote is one-shot — there is no unvote — but the leaderboard still must
 * see it the same way a like used to: unlikes used to skip Redis and a later
 * delete would ZINCRBY a cold set into a one-row board.
 */
describe('VotesService leaderboard writes', () => {
  const source = readFileSync('src/votes/votes.service.ts', 'utf8');

  it('projects a cast vote onto lb:global', () => {
    expect(source).toContain('this.leaderboard.applyDelta(post.authorId, amount)');
  });

  it('never lets a vote skip the leaderboard write', () => {
    // Guards against a future "fast path" that updates the ledger without
    // updating the projection Redis serves reads from.
    const castVoteBody = source.slice(source.indexOf('async castVote'), source.indexOf('async addReceipt'));
    expect(castVoteBody).toContain('this.leaderboard.applyDelta');
  });
});
