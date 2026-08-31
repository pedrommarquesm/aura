import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

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
 * Queues product email. Sending is optional until SMTP exists.
 *
 * A waitlist join must not fail because the mail server is not up. We always
 * persist the rendered message. If SMTP is configured we try once; if it is
 * not, the row stays `queued` for a later flush.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
  ) {}

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

    if (!this.env.SMTP_HOST) {
      this.logger.log(`queued ${mail.template} to ${mail.to} (no SMTP yet)`);
      return;
    }

    try {
      this.deliver({
        to: mail.to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      await this.db
        .update(emailOutbox)
        .set({ status: 'sent', sentAt: new Date(), lastError: null })
        .where(eq(emailOutbox.id, id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'send failed';
      this.logger.warn(`SMTP send failed for ${mail.template}: ${message}`);
      await this.db
        .update(emailOutbox)
        .set({ status: 'failed', lastError: message })
        .where(eq(emailOutbox.id, id));
    }
  }

  /**
   * Minimal SMTP submit over a raw socket. Enough for a single message when
   * a host is configured; not a full client. STARTTLS / auth land with the
   * real mail server.
   */
  private deliver(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): never {
    const from = this.env.MAIL_FROM ?? 'Aura <hello@aurarankd.com>';
    this.logger.log(`would send "${message.subject}" to ${message.to} from ${from}`);
    // SMTP transport is intentionally not opened here. The outbox is the
    // contract. Wiring nodemailer (or the chosen provider) is a one-file
    // change once credentials exist — do not invent a half-working socket.
    throw new Error('SMTP transport is not wired yet');
  }
}

export type { MailTemplateId };
