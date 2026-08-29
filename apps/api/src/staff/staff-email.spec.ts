import { describe, expect, it } from 'vitest';

import { domainIsAllowed, emailDomain, normalizeEmail, parseAllowedDomains } from './staff-email';

describe('staff email helpers', () => {
  it('normalises case and surrounding space', () => {
    expect(normalizeEmail('  Pedro@Aura.app ')).toBe('pedro@aura.app');
  });

  it('parses a comma-separated domain allow-list', () => {
    expect(parseAllowedDomains(' Aura.app, aurarankd.com ')).toEqual(['aura.app', 'aurarankd.com']);
    expect(parseAllowedDomains(undefined)).toEqual([]);
    expect(parseAllowedDomains('')).toEqual([]);
  });

  it('reads the domain after the last @', () => {
    expect(emailDomain('pedro@aura.app')).toBe('aura.app');
  });

  it('does not auto-join anyone when the allow-list is empty', () => {
    expect(domainIsAllowed('pedro@aura.app', [])).toBe(false);
  });

  it('matches an allowed org domain', () => {
    expect(domainIsAllowed('ops@aurarankd.com', ['aurarankd.com'])).toBe(true);
    expect(domainIsAllowed('ops@gmail.com', ['aurarankd.com'])).toBe(false);
  });
});
