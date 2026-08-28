import { describe, expect, it } from 'vitest';

import { secretsEqual } from './moderation.guard';

describe('secretsEqual', () => {
  it('accepts an exact match', () => {
    expect(secretsEqual('correct-horse-battery', 'correct-horse-battery')).toBe(true);
  });

  it('rejects a different value of the same length', () => {
    expect(secretsEqual('correct-horse-batterx', 'correct-horse-battery')).toBe(false);
  });

  it('rejects a different length without throwing', () => {
    expect(secretsEqual('short', 'correct-horse-battery')).toBe(false);
    expect(secretsEqual('correct-horse-battery-extra', 'correct-horse-battery')).toBe(false);
  });
});
