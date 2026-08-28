import { describe, expect, it } from 'vitest';

import { normalizeUsername } from './username';

describe('normalizeUsername', () => {
  it('strips a leading @', () => {
    expect(normalizeUsername('@alice')).toBe('alice');
  });

  it('leaves a bare handle alone', () => {
    expect(normalizeUsername('alice')).toBe('alice');
  });

  it('trims surrounding space', () => {
    expect(normalizeUsername('  @alice  ')).toBe('alice');
  });
});
