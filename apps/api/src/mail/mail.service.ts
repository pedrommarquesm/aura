import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

import { newId } from '../common/ids';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { emailOutbox } from '../db/schema';
import type { Locale } from '../i18n/locales';

import {
  renderWaitlistJoined,
  renderWaitlistReferral,
  type MailTemplateId,
  type WaitlistJoinedPayload,
  type WaitlistReferralPayload,
} from './templates';

export type OutboundMail =
  | { template: 'waitlist_joined'; to: string; locale: Locale; payload: WaitlistJoinedPayload }
  | { template: 'waitlist_referral'; to: string; locale: Locale; payload: WaitlistReferralPayload };

/**
 * Queues product email, then delivers through Resend when `RESEND_API_KEY` is set.
 *
 * A waitlist join must not fail because mail is down. We always persist the
 * rendered message. Unset key → row stays `queued`. Send failure → `failed`
 * with `lastError`; the join itself still succeeds.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  async enqueue(mail: OutboundMail): Promise<void> {
    const rendered =
      mail.template === 'waitlist_joined'
        ? renderWaitlistJoined(mail.locale, mail.payload)
        : renderWaitlistReferral(mail.locale, mail.payload);

    const id = newId();

    await this.db.insert(emailOutbox).values({
      id,
      toEmail: mail.to,
      template: mail.template,
      locale: mail.locale,
      subject: rendered.subject,
      textBody: rendered.text,
      htmlBody: rendered.html,
      status: 'queued',
    });

    if (!this.resend) {
      this.logger.log(`queued ${mail.template} to ${mail.to} (no RESEND_API_KEY)`);
      return;
    }

    const from = this.env.MAIL_FROM ?? 'Aura <hello@auraclimb.com>';
    try {
      const { data, error } = await this.resend.emails.send(
        {
          from,
          to: [mail.to],
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tags: [{ name: 'template', value: mail.template }],
        },
        { idempotencyKey: `outbox/${id}` },
      );

      if (error) {
        await this.markFailed(id, mail.template, error.message || 'Resend send failed');
        return;
      }

      this.logger.log(`sent ${mail.template} to ${mail.to} (${data?.id ?? 'no-id'})`);
      await this.db
        .update(emailOutbox)
        .set({ status: 'sent', sentAt: new Date(), lastError: null })
        .where(eq(emailOutbox.id, id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'send failed';
      await this.markFailed(id, mail.template, message);
    }
  }

  private async markFailed(id: string, template: MailTemplateId, message: string): Promise<void> {
    this.logger.warn(`Resend send failed for ${template}: ${message}`);
    await this.db
      .update(emailOutbox)
      .set({ status: 'failed', lastError: message })
      .where(eq(emailOutbox.id, id));
  }
}

export type { MailTemplateId };
