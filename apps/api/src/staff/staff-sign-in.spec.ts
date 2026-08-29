import { describe, expect, it } from 'vitest';

import { decideStaffSignIn } from './staff-sign-in';

const ownerEmail = 'pedrommarquesm@gmail.com';

describe('decideStaffSignIn', () => {
  it('prefers a linked Google identity over email', () => {
    expect(
      decideStaffSignIn({
        email: 'other@gmail.com',
        ownerEmail,
        allowedDomains: [],
        existingBySub: { status: 'active' },
        existingByEmail: undefined,
      }),
    ).toEqual({ kind: 'existing', match: 'identity' });
  });

  it('refuses a deactivated linked identity', () => {
    expect(
      decideStaffSignIn({
        email: ownerEmail,
        ownerEmail,
        allowedDomains: [],
        existingBySub: { status: 'deactivated' },
        existingByEmail: undefined,
      }),
    ).toEqual({ kind: 'reject', reason: 'deactivated' });
  });

  it('claims an invited row by verified email', () => {
    expect(
      decideStaffSignIn({
        email: 'mod@aurarankd.com',
        ownerEmail,
        allowedDomains: [],
        existingBySub: undefined,
        existingByEmail: { status: 'invited' },
      }),
    ).toEqual({ kind: 'existing', match: 'email' });
  });

  it('bootstraps the configured owner on first login', () => {
    expect(
      decideStaffSignIn({
        email: '  PedroMMarquesM@gmail.com ',
        ownerEmail,
        allowedDomains: [],
        existingBySub: undefined,
        existingByEmail: undefined,
      }),
    ).toEqual({ kind: 'bootstrap-owner' });
  });

  it('auto-provisions a moderator when the org domain is open', () => {
    expect(
      decideStaffSignIn({
        email: 'ops@aurarankd.com',
        ownerEmail,
        allowedDomains: ['aurarankd.com'],
        existingBySub: undefined,
        existingByEmail: undefined,
      }),
    ).toEqual({ kind: 'auto-provision' });
  });

  it('refuses a consumer Google account that was never invited', () => {
    expect(
      decideStaffSignIn({
        email: 'random@gmail.com',
        ownerEmail,
        allowedDomains: [],
        existingBySub: undefined,
        existingByEmail: undefined,
      }),
    ).toEqual({ kind: 'reject', reason: 'not_staff' });
  });

  it('requires an email when there is no linked identity', () => {
    expect(
      decideStaffSignIn({
        email: undefined,
        ownerEmail,
        allowedDomains: ['aurarankd.com'],
        existingBySub: undefined,
        existingByEmail: undefined,
      }),
    ).toEqual({ kind: 'reject', reason: 'email_required' });
  });
});
