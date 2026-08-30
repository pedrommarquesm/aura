import { describe, expect, it, vi } from 'vitest';

import { LeaderboardService } from './leaderboard.service';

function createRedis(initial: Record<string, number> = {}) {
  const scores = new Map(Object.entries(initial));

  return {
    scores,
    zcard: vi.fn(async () => scores.size),
    zscore: vi.fn(async (_key: string, member: string) => {
      const value = scores.get(member);
      return value === undefined ? null : String(value);
    }),
    zadd: vi.fn(async (_key: string, score: number, member: string) => {
      scores.set(member, score);
      return 1;
    }),
    zincrby: vi.fn(async (_key: string, delta: number, member: string) => {
      const next = (scores.get(member) ?? 0) + delta;
      scores.set(member, next);
      return String(next);
    }),
    pipeline: vi.fn(() => {
      const ops: Array<() => void> = [];
      const pipe = {
        del: () => {
          ops.push(() => scores.clear());
          return pipe;
        },
        zadd: (_key: string, score: number, member: string) => {
          ops.push(() => scores.set(member, score));
          return pipe;
        },
        exec: async () => {
          for (const op of ops) op();
          return [];
        },
      };
      return pipe;
    }),
  };
}

function createDb(auraById: Record<string, number>) {
  return {
    select: () => ({
      from: () => ({
        where: async () =>
          Object.entries(auraById).map(([id, aura]) => ({ id, aura })),
      }),
    }),
  };
}

function service(redis: ReturnType<typeof createRedis>, db: unknown) {
  return new LeaderboardService(db as never, redis as never);
}

describe('LeaderboardService.applyDelta', () => {
  it('rebuilds from Postgres instead of creating a singleton on a cold set', async () => {
    const redis = createRedis();
    const board = service(redis, createDb({ u_alice: 190, u_joao: 200, u_you: 30 }));

    await board.applyDelta('u_you', -10);

    expect(redis.zincrby).not.toHaveBeenCalled();
    expect([...redis.scores.entries()].sort()).toEqual([
      ['u_alice', 190],
      ['u_joao', 200],
      ['u_you', 30],
    ]);
  });

  it('increments an existing member', async () => {
    const redis = createRedis({ u_you: 30, u_alice: 190 });
    const board = service(redis, createDb({ u_you: 40, u_alice: 190 }));

    await board.applyDelta('u_you', 10);

    expect(redis.zincrby).toHaveBeenCalledWith('lb:global', 10, 'u_you');
    expect(redis.scores.get('u_you')).toBe(40);
  });
});
