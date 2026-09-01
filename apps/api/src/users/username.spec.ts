import { describe, expect, it } from 'vitest';

import { isReservedUsername, isValidUsernameFormat, normalizeUsername } from './username';

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

describe('isValidUsernameFormat', () => {
  it('accepts 3-30 letters, numbers, or underscore', () => {
    expect(isValidUsernameFormat('alice')).toBe(true);
    expect(isValidUsernameFormat('alice_99')).toBe(true);
    expect(isValidUsernameFormat('a'.repeat(30))).toBe(true);
  });

  it('rejects too short, too long, or invalid characters', () => {
    expect(isValidUsernameFormat('ab')).toBe(false);
    expect(isValidUsernameFormat('a'.repeat(31))).toBe(false);
    expect(isValidUsernameFormat('alice!')).toBe(false);
    expect(isValidUsernameFormat('alice smith')).toBe(false);
  });
});

describe('isReservedUsername', () => {
  it('is case-insensitive', () => {
    expect(isReservedUsername('Admin')).toBe(true);
    expect(isReservedUsername('AURA')).toBe(true);
  });

  it('allows anything not on the list', () => {
    expect(isReservedUsername('pedro')).toBe(false);
  });
});
