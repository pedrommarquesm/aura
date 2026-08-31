import { describe, expect, it } from 'vitest';

import { extractHashtags, normalizeHashtagQuery } from './hashtags';

describe('extractHashtags', () => {
  it('returns nothing for a blank caption', () => {
    expect(extractHashtags(null)).toEqual([]);
    expect(extractHashtags('')).toEqual([]);
    expect(extractHashtags('no tags here')).toEqual([]);
  });

  it('keeps unique tags in first-seen order, lowercased', () => {
    expect(extractHashtags('Gold #Aura and #AURA then #sunset')).toEqual(['aura', 'sunset']);
  });

  it('does not treat #aura as a hit inside #aurarank', () => {
    expect(extractHashtags('#aurarank wins')).toEqual(['aurarank']);
  });

  it('ignores a lone hash and a double hash prefix', () => {
    expect(extractHashtags('see # and ##')).toEqual([]);
    expect(extractHashtags('##aura')).toEqual(['aura']);
  });

  it('indexes Portuguese letters', () => {
    expect(extractHashtags('noite no #Verão')).toEqual(['verão']);
  });
});

describe('normalizeHashtagQuery', () => {
  it('accepts a bare tag or one with a leading hash', () => {
    expect(normalizeHashtagQuery('Sunset')).toBe('sunset');
    expect(normalizeHashtagQuery('  #Sunset  ')).toBe('sunset');
  });

  it('rejects empty or illegal tags', () => {
    expect(normalizeHashtagQuery('')).toBeNull();
    expect(normalizeHashtagQuery('#')).toBeNull();
    expect(normalizeHashtagQuery('has a space')).toBeNull();
    expect(normalizeHashtagQuery('!!!')).toBeNull();
  });
});
