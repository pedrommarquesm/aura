import {
  extractHashtags,
  normalizeHashtagQuery,
  parseCaptionSegments,
} from '@/lib/hashtags';

describe('extractHashtags', () => {
  it('keeps unique tags in first-seen order, lowercased', () => {
    expect(extractHashtags('Gold #Aura and #AURA then #sunset')).toEqual(['aura', 'sunset']);
  });

  it('does not treat #aura as a hit inside #aurarank', () => {
    expect(extractHashtags('#aurarank wins')).toEqual(['aurarank']);
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
    expect(normalizeHashtagQuery('#')).toBeNull();
    expect(normalizeHashtagQuery('has a space')).toBeNull();
  });
});

describe('parseCaptionSegments', () => {
  it('keeps authored casing on the visible span', () => {
    expect(parseCaptionSegments('Gold #Aura now')).toEqual([
      { text: 'Gold ', tag: null },
      { text: '#Aura', tag: 'aura' },
      { text: ' now', tag: null },
    ]);
  });
});
