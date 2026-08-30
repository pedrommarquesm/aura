import { describe, expect, it, vi } from 'vitest';

import { LeaderboardService } from './leaderboard.service';

type Person = {
  id: string;
  username: string;
  aura: number;
  displayName?: string | null;
  avatarUrl?: string | null;
  title?: string | null;
};

const PEOPLE: Person[] = [
  { id: 'u_joao', username: 'joao', aura: 200, title: 'Aura Merchant' },
  { id: 'u_alice', username: 'alice', aura: 190, title: 'Aura Lord' },
  { id: 'u_you', username: 'pmarques', aura: 30 },
];

function profileRow(person: Person) {
  return {
    id: person.id,
    userId: person.id,
    username: person.username,
    displayName: person.displayName ?? null,
    avatarUrl: person.avatarUrl ?? null,
    aura: person.aura,
    title: person.title ?? null,
  };
}

function sortedEntries(scores: Map<string, number>) {
  return [...scores.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

/**
 * In-memory Redis sorted set with real ZINCRBY semantics: a missing member is
 * created at `delta`. That is the footgun that produced the one-person board.
 */
function createRedis(initial: Record<string, number> = {}) {
  const scores = new Map(Object.entries(initial));

  return {
    scores,
    zcard: vi.fn(() => Promise.resolve(scores.size)),
    zscore: vi.fn((_key: string, member: string) =>
      Promise.resolve(scores.has(member) ? String(scores.get(member)) : null),
    ),
    zadd: vi.fn((_key: string, score: number, member: string) => {
      scores.set(member, score);
      return Promise.resolve(1);
    }),
    zincrby: vi.fn((_key: string, delta: number, member: string) => {
      const next = (scores.get(member) ?? 0) + delta;
      scores.set(member, next);
      return Promise.resolve(String(next));
    }),
    zrevrange: vi.fn((_key: string, start: number, stop: number) => {
      const slice = sortedEntries(scores).slice(start, stop + 1);
      return Promise.resolve(slice.flatMap(([id, score]) => [id, String(score)]));
    }),
    zrevrank: vi.fn((_key: string, member: string) => {
      const rank = sortedEntries(scores).findIndex(([id]) => id === member);
      return Promise.resolve(rank === -1 ? null : rank);
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
        exec: () => {
          for (const op of ops) op();
          return Promise.resolve([]);
        },
      };
      return pipe;
    }),
  };
}

function createDb(people: Person[]) {
  const rows = people.map(profileRow);

  return {
    select: (columns?: Record<string, unknown>) => {
      const keys = columns ? Object.keys(columns) : [];
      const wantsCount = keys.includes('count');
      const wantsAuraOnly = keys.length === 1 && keys[0] === 'aura';

      return {
        from: () => ({
          where: () => {
            const payload = wantsCount
              ? [{ count: people.length }]
              : wantsAuraOnly
                ? people.map((person) => ({ aura: person.aura }))
                : rows;
            const result = Promise.resolve(payload);
            return Object.assign(result, {
              orderBy: () => ({
                limit: () => result,
              }),
            });
          },
        }),
      };
    },
  };
}

function board(people: Person[], redisScores?: Record<string, number>) {
  const redis = createRedis(redisScores);
  const db = createDb(people);
  return {
    redis,
    service: new LeaderboardService(db as never, redis as never),
  };
}

describe('Redis ZINCRBY footgun', () => {
  it('creates a member at the delta when the set is missing — the one-person board', async () => {
    const redis = createRedis();
    await redis.zincrby('lb:global', -10, 'u_you');

    expect(redis.scores.size).toBe(1);
    expect(redis.scores.get('u_you')).toBe(-10);
  });
});

describe('LeaderboardService.applyDelta', () => {
  it('rebuilds from Postgres instead of ZINCRBY on a cold set', async () => {
    const { redis, service } = board(PEOPLE);

    await service.applyDelta('u_you', -10);

    expect(redis.zincrby).not.toHaveBeenCalled();
    expect([...redis.scores.entries()].sort()).toEqual([
      ['u_alice', 190],
      ['u_joao', 200],
      ['u_you', 30],
    ]);
  });

  it('does not write −10 as the score when the ledger already stored the new total', async () => {
    const { redis, service } = board([{ ...PEOPLE[2]!, aura: 20 }, PEOPLE[0]!, PEOPLE[1]!]);

    await service.applyDelta('u_you', -10);

    expect(redis.scores.get('u_you')).toBe(20);
    expect(redis.scores.size).toBe(3);
  });

  it('increments an existing member and leaves everyone else alone', async () => {
    const { redis, service } = board(PEOPLE, { u_you: 30, u_alice: 190, u_joao: 200 });

    await service.applyDelta('u_you', -10);

    expect(redis.zincrby).toHaveBeenCalledWith('lb:global', -10, 'u_you');
    expect(redis.scores.get('u_you')).toBe(20);
    expect(redis.scores.get('u_alice')).toBe(190);
    expect(redis.scores.get('u_joao')).toBe(200);
  });

  it('two deletes on a warm set only move the author', async () => {
    const { redis, service } = board(PEOPLE, { u_you: 30, u_alice: 190, u_joao: 200 });

    await service.applyDelta('u_you', -10);
    await service.applyDelta('u_you', -10);

    expect(redis.scores.get('u_you')).toBe(10);
    expect(redis.scores.size).toBe(3);
  });

  it('inserts a missing member at the Postgres total, not at the delta', async () => {
    const redis = createRedis({ u_alice: 190, u_joao: 200 });
    const db = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([{ aura: 30 }]),
        }),
      }),
    };
    const service = new LeaderboardService(db as never, redis as never);

    await service.applyDelta('u_you', 10);

    expect(redis.zincrby).not.toHaveBeenCalled();
    expect(redis.zadd).toHaveBeenCalledWith('lb:global', 30, 'u_you');
    expect(redis.scores.get('u_you')).toBe(30);
    expect(redis.scores.get('u_alice')).toBe(190);
  });
});

describe('LeaderboardService.global', () => {
  it('rebuilds a cold set and returns everyone, not a SQL one-off that the next write can poison', async () => {
    const { redis, service } = board(PEOPLE);

    const page = await service.global('u_you');

    expect(page.total).toBe(3);
    expect(page.entries.map((entry) => entry.username)).toEqual(['joao', 'alice', 'pmarques']);
    expect(page.entries.find((entry) => entry.userId === 'u_you')?.aura).toBe(30);
    expect(redis.scores.size).toBe(3);
  });

  it('heals the post-delete singleton: one row at −10 becomes the full Postgres board', async () => {
    const { service } = board(PEOPLE, { u_you: -10 });

    const page = await service.global('u_you');

    expect(page.total).toBe(3);
    expect(page.entries).toHaveLength(3);
    expect(page.entries.every((entry) => entry.aura !== -10)).toBe(true);
    expect(page.entries.find((entry) => entry.userId === 'u_you')).toMatchObject({
      username: 'pmarques',
      aura: 30,
      rank: 3,
    });
    expect(page.viewer).toMatchObject({ userId: 'u_you', aura: 30, rank: 3 });
  });

  it('after a delete on a cold set, the next read still has every user', async () => {
    const { redis, service } = board(PEOPLE);

    await service.applyDelta('u_you', -10);
    const page = await service.global(undefined);

    expect(redis.zincrby).not.toHaveBeenCalled();
    expect(page.entries).toHaveLength(3);
    expect(page.entries.map((entry) => entry.userId).sort()).toEqual(['u_alice', 'u_joao', 'u_you']);
  });
});
