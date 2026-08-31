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
    expect(mail.text).toContain('sign up and open the app');
  });

  it('tells a referred joiner that the sender is paid at signup', () => {
    const mail = renderWaitlistJoined('en', {
      referralUrl: 'https://www.aurarankd.com/?ref=AB23CD45',
      aura: 10,
      referralAura: 10,
      viaReferral: true,
    });

    expect(mail.text).toContain('the person who sent you this gets +10');
  });

  it('renders a referral email in Portuguese without leaking raw HTML from the URL', () => {
    const mail = renderWaitlistReferral('pt', {
      aura: 30,
      referralCount: 2,
      referralUrl: 'https://www.aurarankd.com/?ref=AB23CD45',
      referralAura: 10,
    });

    expect(mail.subject).toContain('+10 Aura');
    expect(mail.subject).toContain('criou conta');
    expect(mail.text).toContain('2');
    expect(mail.html).not.toContain('<script');
  });

  it('renders a Brazilian join email without falling back to European Portuguese', () => {
    const mail = renderWaitlistJoined('pt-br', {
      referralUrl: 'https://www.aurarankd.com/?ref=AB23CD45',
      aura: 10,
      referralAura: 10,
    });

    expect(mail.subject).toContain('Você está dentro');
    expect(mail.text).toContain('abrir o app');
    expect(mail.text).not.toContain('Estás');
  });

  it('renders a Spanish referral email', () => {
    const mail = renderWaitlistReferral('es', {
      aura: 20,
      referralCount: 3,
      referralUrl: 'https://www.aurarankd.com/?ref=AB23CD45',
      referralAura: 10,
    });

    expect(mail.subject).toContain('creó cuenta');
    expect(mail.text).toContain('3');
  });

  it('pays the referrer copy at signup, not at waitlist join', () => {
    const mail = renderWaitlistReferral('en', {
      aura: 20,
      referralCount: 1,
      referralUrl: 'https://www.aurarankd.com/?ref=AB23CD45',
      referralAura: 10,
    });

    expect(mail.subject).toContain('signed up');
    expect(mail.text).not.toContain('joined the early beta');
  });
});
