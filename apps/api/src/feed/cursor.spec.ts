import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from './cursor';

const SECRET = 'test-secret-at-least-32-characters-long';

describe('feed cursors', () => {
  it('round-trips a cursor', () => {
    const cursor = { value: 1_700_000_000_000, id: '01a0-abc' };

    expect(decodeCursor(encodeCursor(cursor, SECRET), SECRET)).toEqual(cursor);
  });

  it('round-trips a fractional trending score', () => {
    const cursor = { value: 9.394839, id: 'p_hot' };

    expect(decodeCursor(encodeCursor(cursor, SECRET), SECRET)).toEqual(cursor);
  });

  it('rejects a tampered payload', () => {
    const encoded = encodeCursor({ value: 100, id: 'abc' }, SECRET);
    const [, signature] = encoded.split('.');
    const forged = `${Buffer.from('999999:abc').toString('base64url')}.${signature}`;

    expect(() => decodeCursor(forged, SECRET)).toThrow(/Malformed cursor/);
  });

  it('rejects a cursor signed with a different secret', () => {
    const encoded = encodeCursor({ value: 100, id: 'abc' }, 'another-secret-32-characters-long!!');

    expect(() => decodeCursor(encoded, SECRET)).toThrow(/Malformed cursor/);
  });

  it('rejects garbage', () => {
    expect(() => decodeCursor('nonsense', SECRET)).toThrow(/Malformed cursor/);
    expect(() => decodeCursor('', SECRET)).toThrow(/Malformed cursor/);
    expect(() => decodeCursor('a.b.c', SECRET)).toThrow(/Malformed cursor/);
  });

  it('handles ids containing a colon', () => {
    const cursor = { value: 5, id: 'weird:id:value' };

    expect(decodeCursor(encodeCursor(cursor, SECRET), SECRET)).toEqual(cursor);
  });
});
