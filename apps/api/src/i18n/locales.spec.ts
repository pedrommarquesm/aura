import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, languageTag, negotiateLocale, resolveLocale } from './locales';

describe('resolveLocale', () => {
  it('accepts a supported locale', () => {
    expect(resolveLocale('pt')).toBe('pt');
    expect(resolveLocale('en')).toBe('en');
  });

  it('matches on the primary subtag', () => {
    expect(resolveLocale('pt-PT')).toBe('pt');
    expect(resolveLocale('en-GB')).toBe('en');
  });

  it('serves Brazilian Portuguese the Portuguese catalog rather than English', () => {
    expect(resolveLocale('pt-BR')).toBe('pt');
  });

  it('returns undefined for an unsupported language', () => {
    expect(resolveLocale('fr-FR')).toBeUndefined();
    expect(resolveLocale('')).toBeUndefined();
    expect(resolveLocale(null)).toBeUndefined();
  });
});

describe('negotiateLocale', () => {
  it('falls back to the default when the header is absent', () => {
    expect(negotiateLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale('')).toBe(DEFAULT_LOCALE);
  });

  it('picks the first supported language', () => {
    expect(negotiateLocale('pt-PT,pt;q=0.9,en;q=0.8')).toBe('pt');
  });

  it('honours quality values rather than list order', () => {
    expect(negotiateLocale('en;q=0.7, pt;q=0.9')).toBe('pt');
  });

  it('skips unsupported languages to find one we ship', () => {
    expect(negotiateLocale('fr-FR,de;q=0.9,pt;q=0.5')).toBe('pt');
  });

  it('falls back to the default when nothing matches', () => {
    expect(negotiateLocale('fr-FR,de;q=0.9')).toBe(DEFAULT_LOCALE);
  });

  it('treats a wildcard as the default', () => {
    expect(negotiateLocale('*')).toBe(DEFAULT_LOCALE);
  });

  it('ignores languages explicitly refused with q=0', () => {
    expect(negotiateLocale('pt;q=0, en')).toBe('en');
  });

  it('does not throw on a malformed header', () => {
    expect(negotiateLocale(';;;')).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale('pt;q=notanumber')).toBe(DEFAULT_LOCALE);
  });
});

describe('languageTag', () => {
  it('expands pt to European Portuguese for lang attributes and Intl', () => {
    expect(languageTag('pt')).toBe('pt-PT');
    expect(languageTag('en')).toBe('en');
  });
});
