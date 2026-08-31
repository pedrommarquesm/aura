import { normalizeEmail } from '../staff/staff-email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseWaitlistEmail(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (email.length < 3 || email.length > 320) return null;
  if (!EMAIL_PATTERN.test(email)) return null;
  return email;
}
