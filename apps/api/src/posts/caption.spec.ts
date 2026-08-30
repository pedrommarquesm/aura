import { describe, expect, it } from 'vitest';

import { CAPTION_MAX_LENGTH, normalizeCaption } from './caption';

describe('normalizeCaption', () => {
  it('trims and keeps a real caption', () => {
    expect(normalizeCaption('  golden hour  ')).toBe('golden hour');
  });

  it('turns blank copy into no caption', () => {
    expect(normalizeCaption('   ')).toBeNull();
    expect(normalizeCaption(null)).toBeNull();
    expect(normalizeCaption(undefined)).toBeNull();
  });

  it('refuses to grow past the create-upload cap', () => {
    const tooLong = 'a'.repeat(CAPTION_MAX_LENGTH + 40);
    expect(normalizeCaption(tooLong)?.length).toBe(CAPTION_MAX_LENGTH);
  });
});
