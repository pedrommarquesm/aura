import { domainIsAllowed, normalizeEmail } from './staff-email';

export type StaffSignInDecision =
  | { kind: 'existing'; match: 'identity' | 'email' }
  | { kind: 'bootstrap-owner' }
  | { kind: 'auto-provision' }
  | { kind: 'reject'; reason: 'not_staff' | 'deactivated' | 'email_required' };

export interface StaffSignInInput {
  email: string | undefined;
  ownerEmail: string;
  allowedDomains: string[];
  existingBySub: { status: 'invited' | 'active' | 'deactivated' } | undefined;
  existingByEmail: { status: 'invited' | 'active' | 'deactivated' } | undefined;
}

/**
 * Pure decision for who may enter the backoffice.
 *
 * Order:
 * 1. A linked Google `sub` always wins (same person, email may have changed).
 * 2. An invited / existing row matching the verified email is claimed.
 * 3. The configured owner email bootstraps the GOD account on first login.
 * 4. An allowed org domain auto-provisions a moderator (off until configured).
 * 5. Everyone else is refused — consumer Google sign-in does not get you in.
 */
export function decideStaffSignIn(input: StaffSignInInput): StaffSignInDecision {
  if (input.existingBySub) {
    if (input.existingBySub.status === 'deactivated') {
      return { kind: 'reject', reason: 'deactivated' };
    }
    return { kind: 'existing', match: 'identity' };
  }

  if (!input.email) {
    return { kind: 'reject', reason: 'email_required' };
  }

  const email = normalizeEmail(input.email);
  const ownerEmail = normalizeEmail(input.ownerEmail);

  if (input.existingByEmail) {
    if (input.existingByEmail.status === 'deactivated') {
      return { kind: 'reject', reason: 'deactivated' };
    }
    return { kind: 'existing', match: 'email' };
  }

  if (email === ownerEmail) {
    return { kind: 'bootstrap-owner' };
  }

  if (domainIsAllowed(email, input.allowedDomains)) {
    return { kind: 'auto-provision' };
  }

  return { kind: 'reject', reason: 'not_staff' };
}
