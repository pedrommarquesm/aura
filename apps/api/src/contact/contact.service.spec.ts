import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('ContactService submit limits', () => {
  const source = readFileSync('src/contact/contact.service.ts', 'utf8');

  it('rate-limits contact by IP and by email', () => {
    expect(source).toContain('rl:contact:${ip}');
    expect(source).toContain('rl:contact:email:');
    expect(source).toContain('CONTACT_EMAIL_RATE_LIMIT_MAX');
  });

  it('still spends an IP slot on a garbage email', () => {
    expect(source).toContain('assertContactLimits(ip, null)');
  });
});
