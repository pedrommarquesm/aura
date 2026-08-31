import { describe, expect, it } from 'vitest';

import { renderWaitlistJoined, renderWaitlistReferral } from './templates';

describe('waitlist email templates', () => {
  it('renders a join email that carries the referral link and the award', () => {
    const mail = renderWaitlistJoined('en', {
      referralUrl: 'https://www.aurarankd.com/?ref=AB23CD45',
      aura: 10,
      referralAura: 10,
    });

    expect(mail.subject).toContain('+10 Aura');
    expect(mail.text).toContain('https://www.aurarankd.com/?ref=AB23CD45');
    expect(mail.html).toContain('https://www.aurarankd.com/?ref=AB23CD45');
    expect(mail.html).toContain('+10 Aura');
  });

  it('renders a referral email in Portuguese without leaking raw HTML from the URL', () => {
    const mail = renderWaitlistReferral('pt', {
      aura: 30,
      referralCount: 2,
      referralUrl: 'https://www.aurarankd.com/?ref=AB23CD45',
      referralAura: 10,
    });

    expect(mail.subject).toContain('+10 Aura');
    expect(mail.text).toContain('2');
    expect(mail.html).not.toContain('<script');
  });
});
