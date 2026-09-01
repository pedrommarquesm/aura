import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
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
  waitlistReferralIdempotencyKey,
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
      await this.assertJoinLimits(ip, null);
      throw new AppError(ErrorCode.INVALID_EMAIL, 'That email does not look right');
    }

    if (this.env.WAITLIST_ENABLED === false) {
      throw new AppError(ErrorCode.WAITLIST_UNAVAILABLE, 'Waitlist is closed', 503);
    }

    const existing = await this.findByEmail(email);
    if (existing) {
      // Already on the list: do not spend a slot. People re-open the form to
      // copy their link, and a 429 there looks like the product broke.
      return this.toPublic(existing, { alreadyJoined: true, awardedAura: 0 });
    }

    await this.assertJoinLimits(ip, email);

    const locale = resolveLocale(input.locale) ?? 'en';
    const referrer = await this.resolveReferrer(input.referralCode, email);

    const created = await this.insertWithCode({
      email,
      locale,
      referredById: referrer?.id ?? null,
      aura: JOIN_AURA,
    });

    await this.mail.enqueue({
      template: 'waitlist_joined',
      to: email,
      locale,
      payload: {
        referralUrl: this.referralUrl(created.referralCode),
        aura: created.aura,
        referralAura: REFERRAL_AURA,
        viaReferral: Boolean(referrer),
      },
    });

    return this.toPublic(created, { alreadyJoined: false, awardedAura: JOIN_AURA });
  }

  /**
   * Ports waitlist Aura onto a freshly created (or first-seen) account, and
   * pays the referrer if this email arrived through a link.
   *
   * Referral pay happens here — not at join — so a fake inbox cannot mint
   * Aura for the person who shared the link. Idempotent: a second sign-in
   * with the same email is a no-op. Matching is by email only.
   */
  async claimForAccount(userId: string, email: string | null | undefined): Promise<number> {
    const normalized = email ? parseWaitlistEmail(email) : null;
    if (!normalized) return 0;

    const entry = await this.findByEmail(normalized);
    if (!entry) return 0;

    try {
      await this.creditReferrerOnClaim(entry);
    } catch (error) {
      this.logger.warn(
        `waitlist referral credit failed for ${entry.id}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }

    if (entry.claimedUserId || entry.aura <= 0) return 0;

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
      // this failure as non-blocking. Referral credit stays — the account
      // did get created.
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

  /**
   * Pays the referrer once the joiner has a real account. Atomic on
   * `referral_credited_at` so two sign-in retries cannot double-pay.
   */
  private async creditReferrerOnClaim(joiner: WaitlistEntry): Promise<void> {
    if (!joiner.referredById || joiner.referralCreditedAt) return;

    const [locked] = await this.db
      .update(waitlistEntries)
      .set({
        referralCreditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(waitlistEntries.id, joiner.id),
          isNull(waitlistEntries.referralCreditedAt),
          isNotNull(waitlistEntries.referredById),
        ),
      )
      .returning();

    if (!locked) return;

    try {
      const paid = await this.payReferrer(locked);
      if (!paid) return;

      try {
        await this.mail.enqueue({
          template: 'waitlist_referral',
          to: paid.email,
          locale: resolveLocale(paid.locale) ?? 'en',
          payload: {
            aura: paid.aura,
            referralCount: paid.referralCount,
            referralUrl: this.referralUrl(paid.referralCode),
            referralAura: REFERRAL_AURA,
          },
        });
      } catch (error) {
        this.logger.warn(
          `waitlist referral mail failed for ${paid.email}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    } catch (error) {
      await this.db
        .update(waitlistEntries)
        .set({
          referralCreditedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(waitlistEntries.id, joiner.id));
      throw error;
    }
  }

  private async payReferrer(joiner: WaitlistEntry): Promise<{
    email: string;
    locale: string;
    referralCode: string;
    aura: number;
    referralCount: number;
  } | null> {
    const referrerId = joiner.referredById;
    if (!referrerId) return null;

    const [referrer] = await this.db
      .select()
      .from(waitlistEntries)
      .where(eq(waitlistEntries.id, referrerId));

    if (!referrer) {
      this.logger.warn(`waitlist referrer ${referrerId} missing for ${joiner.id}`);
      return null;
    }

    const [onWaitlist] = await this.db
      .update(waitlistEntries)
      .set({
        aura: sql`${waitlistEntries.aura} + ${REFERRAL_AURA}`,
        referralCount: sql`${waitlistEntries.referralCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(waitlistEntries.id, referrer.id), isNull(waitlistEntries.claimedUserId)))
      .returning();

    if (onWaitlist) {
      return {
        email: referrer.email,
        locale: referrer.locale,
        referralCode: referrer.referralCode,
        aura: onWaitlist.aura,
        referralCount: onWaitlist.referralCount,
      };
    }

    const claimedUserId = referrer.claimedUserId;
    if (!claimedUserId) {
      this.logger.warn(`waitlist referrer ${referrer.id} has no account to credit`);
      return null;
    }

    await this.ledger.apply({
      userId: claimedUserId,
      type: 'BONUS',
      amount: REFERRAL_AURA,
      metadata: {
        source: 'waitlist_referral',
        waitlistId: joiner.id,
        referrerWaitlistId: referrer.id,
      },
      idempotencyKey: waitlistReferralIdempotencyKey(joiner.id),
    });

    const [counted] = await this.db
      .update(waitlistEntries)
      .set({
        referralCount: sql`${waitlistEntries.referralCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(waitlistEntries.id, referrer.id))
      .returning();

    return {
      email: referrer.email,
      locale: referrer.locale,
      referralCode: referrer.referralCode,
      aura: referrer.aura,
      referralCount: counted?.referralCount ?? referrer.referralCount + 1,
    };
  }

  /**
   * New joins and garbage emails spend slots. `email` is null for an invalid
   * address — those still hit IP + global so a flood of junk cannot skip the
   * limiter by failing validation.
   */
  private async assertJoinLimits(ip: string, email: string | null): Promise<void> {
    const allowed = await Promise.all([
      this.consumeBucket(
        `rl:waitlist:${ip}`,
        this.env.WAITLIST_RATE_LIMIT_MAX,
        this.env.WAITLIST_RATE_LIMIT_WINDOW_MS,
      ),
      this.consumeBucket(
        'rl:waitlist:global',
        this.env.WAITLIST_GLOBAL_RATE_LIMIT_MAX,
        this.env.WAITLIST_GLOBAL_RATE_LIMIT_WINDOW_MS,
      ),
      email
        ? this.consumeBucket(
            `rl:waitlist:email:${email}`,
            this.env.WAITLIST_EMAIL_RATE_LIMIT_MAX,
            this.env.WAITLIST_EMAIL_RATE_LIMIT_WINDOW_MS,
          )
        : Promise.resolve(true),
    ]);

    if (allowed.some((ok) => !ok)) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Too many joins from this network', 429);
    }
  }

  private async consumeBucket(key: string, max: number, windowMs: number): Promise<boolean> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, windowMs);
    }
    return count <= max;
  }
}
