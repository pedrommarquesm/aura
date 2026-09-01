import { describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

import { MailService } from './mail.service';

function fakeDb() {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];

  return {
    inserts,
    updates,
    insert: () => ({
      values: (row: Record<string, unknown>) => {
        inserts.push(row);
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          updates.push(values);
          return Promise.resolve();
        },
      }),
    }),
  };
}

const joined = {
  template: 'waitlist_joined' as const,
  to: 'maya@example.com',
  locale: 'en' as const,
  payload: {
    referralUrl: 'https://www.auraclimb.com/?ref=AB23CD45',
    aura: 10,
    referralAura: 10,
  },
};

describe('MailService', () => {
  it('persists the rendered message and skips Resend when no API key is set', async () => {
    const db = fakeDb();
    const mail = new MailService(db as never, { RESEND_API_KEY: undefined } as never);

    await mail.enqueue(joined);

    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0]?.status).toBe('queued');
    expect(db.inserts[0]?.toEmail).toBe('maya@example.com');
    expect(db.inserts[0]?.subject).toContain('+10 Aura');
    expect(send).not.toHaveBeenCalled();
    expect(db.updates).toHaveLength(0);
  });

  it('marks the outbox sent after Resend accepts the message', async () => {
    send.mockResolvedValueOnce({ data: { id: 're_123' }, error: null });
    const db = fakeDb();
    const mail = new MailService(
      db as never,
      { RESEND_API_KEY: 're_test', MAIL_FROM: 'Aura <hello@auraclimb.com>' } as never,
    );

    await mail.enqueue(joined);

    expect(send).toHaveBeenCalledTimes(1);
    const [payload, options] = send.mock.calls[0] as [
      { from: string; to: string[]; html: string; text: string; tags: Array<{ name: string; value: string }> },
      { idempotencyKey: string },
    ];
    expect(payload.from).toBe('Aura <hello@auraclimb.com>');
    expect(payload.to).toEqual(['maya@example.com']);
    expect(payload.html).toContain('https://www.auraclimb.com/?ref=AB23CD45');
    expect(payload.text).toContain('https://www.auraclimb.com/?ref=AB23CD45');
    expect(payload.tags).toEqual([{ name: 'template', value: 'waitlist_joined' }]);
    expect(options.idempotencyKey).toMatch(/^outbox\//);
    expect(db.updates.some((update) => update.status === 'sent')).toBe(true);
  });

  it('marks the outbox failed when Resend returns an error, without throwing', async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { message: 'domain not verified', name: 'validation_error' },
    });
    const db = fakeDb();
    const mail = new MailService(db as never, { RESEND_API_KEY: 're_test' } as never);

    await expect(mail.enqueue(joined)).resolves.toBeUndefined();
    expect(db.updates.some((update) => update.status === 'failed')).toBe(true);
    expect(db.updates.some((update) => update.lastError === 'domain not verified')).toBe(true);
  });

  it('marks the outbox failed when the network throws', async () => {
    send.mockRejectedValueOnce(new Error('ECONNRESET'));
    const db = fakeDb();
    const mail = new MailService(db as never, { RESEND_API_KEY: 're_test' } as never);

    await expect(mail.enqueue(joined)).resolves.toBeUndefined();
    expect(db.updates.some((update) => update.status === 'failed')).toBe(true);
    expect(db.updates.some((update) => update.lastError === 'ECONNRESET')).toBe(true);
  });
});
