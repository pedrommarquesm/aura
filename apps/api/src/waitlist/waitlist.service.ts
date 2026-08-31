import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';

import { AuraLedgerService } from '../aura/aura-ledger.service';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { waitlistEntries, type WaitlistEntry } from '../db/schema';
import { resolveLocale, type Locale } from '../i18n/locales';
import { MailService } from '../mail/mail.service';
import { REDIS } from '../redis/redis.module';

import {
  generateReferralCode,
  JOIN_AURA,
  normalizeReferralCode,
  REFERRAL_AURA,
  waitlistClaimIdempotencyKey,
} from './referral-code';
import { parseWaitlistEmail } from './waitlist-email';

export interface WaitlistPublic {
  referralCode: string;
  aura: number;
  referralCount: number;
  alreadyJoined: boolean;
  referralUrl: string;
  awardedAura: number;
}

export interface JoinWaitlistInput {
  email: string;
  referralCode?: string | null;
  locale?: string | null;
}

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly mail: MailService,
    private readonly ledger: AuraLedgerService,
  ) {}

  referralUrl(code: string): string {
    return `${this.env.PUBLIC_SITE_URL.replace(/\/$/, '')}/?ref=${code}`;
  }

  toPublic(entry: WaitlistEntry, extras: { alreadyJoined: boolean; awardedAura: number }): WaitlistPublic {
    return {
      referralCode: entry.referralCode,
      aura: entry.aura,
      referralCount: entry.referralCount,
      alreadyJoined: extras.alreadyJoined,
      referralUrl: this.referralUrl(entry.referralCode),
      awardedAura: extras.awardedAura,
    };
  }

  async join(input: JoinWaitlistInput, ip: string): Promise<WaitlistPublic> {
    const email = parseWaitlistEmail(input.email);
    if (!email) {
      throw new AppError(ErrorCode.INVALID_EMAIL, 'That email does not look right');
    }

    if (this.env.WAITLIST_ENABLED === false) {
      throw new AppError(ErrorCode.WAITLIST_UNAVAILABLE, 'Waitlist is closed', 503);
    }

    const existing = await this.findByEmail(email);
    if (existing) {
      return this.toPublic(existing, { alreadyJoined: true, awardedAura: 0 });
    }

    const allowed = await this.consumeSlot(ip);
    if (!allowed) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Too many joins from this network', 429);
    }

    const locale = resolveLocale(input.locale) ?? 'en';
    const referrer = await this.resolveReferrer(input.referralCode, email);

    const created = await this.insertWithCode({
      email,
      locale,
      referredById: referrer?.id ?? null,
      aura: JOIN_AURA,
    });

    if (referrer) {
      await this.creditReferrer(referrer);
    }

    await this.mail.enqueue({
      template: 'waitlist_joined',
      to: email,
      locale,
      payload: {
        referralUrl: this.referralUrl(created.referralCode),
        aura: created.aura,
        referralAura: REFERRAL_AURA,
      },
    });

    return this.toPublic(created, { alreadyJoined: false, awardedAura: JOIN_AURA });
  }

  /**
   * Ports waitlist Aura onto a freshly created (or first-seen) account.
   *
   * Idempotent: a second sign-in with the same email is a no-op. Matching is
   * by email only — Apple/Google subject ids do not exist on the waitlist.
   * Returns the amount written, or 0 when there was nothing to claim.
   */
  async claimForAccount(userId: string, email: string | null | undefined): Promise<number> {
    const normalized = email ? parseWaitlistEmail(email) : null;
    if (!normalized) return 0;

    const entry = await this.findByEmail(normalized);
    if (!entry || entry.claimedUserId || entry.aura <= 0) return 0;

    const [marked] = await this.db
      .update(waitlistEntries)
      .set({
        claimedUserId: userId,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(waitlistEntries.id, entry.id), isNull(waitlistEntries.claimedUserId)))
      .returning();

    if (!marked || marked.claimedUserId !== userId) return 0;

    try {
      const result = await this.ledger.apply({
        userId,
        type: 'BONUS',
        amount: entry.aura,
        metadata: {
          source: 'waitlist',
          waitlistId: entry.id,
          referralCount: entry.referralCount,
        },
        idempotencyKey: waitlistClaimIdempotencyKey(entry.id),
      });

      this.logger.log(`claimed ${entry.aura} waitlist Aura onto ${userId}`);
      return result.deduplicated ? 0 : entry.aura;
    } catch (error) {
      this.logger.warn(
        `waitlist claim ledger write failed for ${userId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      // Leave the row unclaimed so the next sign-in retries. Auth treats
      // this failure as non-blocking.
      await this.db
        .update(waitlistEntries)
        .set({
          claimedUserId: null,
          claimedAt: null,
          updatedAt: new Date(),
        })
        .where(and(eq(waitlistEntries.id, entry.id), eq(waitlistEntries.claimedUserId, userId)));
      return 0;
    }
  }

  private async findByEmail(email: string): Promise<WaitlistEntry | undefined> {
    const [row] = await this.db
      .select()
      .from(waitlistEntries)
      .where(sql`lower(${waitlistEntries.email}) = ${email}`);
    return row;
  }

  private async resolveReferrer(
    rawCode: string | null | undefined,
    joinerEmail: string,
  ): Promise<WaitlistEntry | null> {
    const code = normalizeReferralCode(rawCode);
    if (!code) return null;

    const [referrer] = await this.db
      .select()
      .from(waitlistEntries)
      .where(eq(waitlistEntries.referralCode, code));

    if (!referrer) return null;
    if (referrer.email === joinerEmail) return null;
    return referrer;
  }

  private async insertWithCode(input: {
    email: string;
    locale: Locale;
    referredById: string | null;
    aura: number;
  }): Promise<WaitlistEntry> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const referralCode = generateReferralCode();
      try {
        const [row] = await this.db
          .insert(waitlistEntries)
          .values({
            id: newId(),
            email: input.email,
            referralCode,
            referredById: input.referredById,
            locale: input.locale,
            aura: input.aura,
          })
          .returning();
        if (row) return row;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('waitlist_entries_referral_code_idx')) continue;
        if (message.includes('waitlist_entries_email_lower_idx')) {
          const existing = await this.findByEmail(input.email);
          if (existing) return existing;
        }
        throw error;
      }
    }

    throw new AppError(ErrorCode.INTERNAL, 'Could not allocate a referral code', 500);
  }

  private async creditReferrer(referrer: WaitlistEntry): Promise<void> {
    const [updated] = await this.db
      .update(waitlistEntries)
      .set({
        aura: sql`${waitlistEntries.aura} + ${REFERRAL_AURA}`,
        referralCount: sql`${waitlistEntries.referralCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(waitlistEntries.id, referrer.id))
      .returning();

    if (!updated) return;

    await this.mail.enqueue({
      template: 'waitlist_referral',
      to: referrer.email,
      locale: referrer.locale === 'pt' ? 'pt' : 'en',
      payload: {
        aura: updated.aura,
        referralCount: updated.referralCount,
        referralUrl: this.referralUrl(referrer.referralCode),
        referralAura: REFERRAL_AURA,
      },
    });
  }

  private async consumeSlot(ip: string): Promise<boolean> {
    const key = `rl:waitlist:${ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, this.env.WAITLIST_RATE_LIMIT_WINDOW_MS);
    }
    return count <= this.env.WAITLIST_RATE_LIMIT_MAX;
  }
}
