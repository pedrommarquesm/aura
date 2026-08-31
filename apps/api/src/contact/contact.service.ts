import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { contactMessages } from '../db/schema';
import { resolveLocale } from '../i18n/locales';
import { REDIS } from '../redis/redis.module';
import { parseWaitlistEmail } from '../waitlist/waitlist-email';

export interface SubmitContactInput {
  name: string;
  email: string;
  message: string;
  locale?: string | null;
}

@Injectable()
export class ContactService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async submit(input: SubmitContactInput, ip: string): Promise<{ ok: true }> {
    const email = parseWaitlistEmail(input.email);
    if (!email) {
      await this.assertContactLimits(ip, null);
      throw new AppError(ErrorCode.INVALID_EMAIL, 'That email does not look right');
    }

    await this.assertContactLimits(ip, email);

    const name = input.name.trim();
    const message = input.message.trim();
    if (name.length < 2 || name.length > 80) {
      throw AppError.badRequest('Name must be 2–80 characters');
    }
    if (message.length < 10 || message.length > 2000) {
      throw AppError.badRequest('Message must be 10–2000 characters');
    }

    await this.db.insert(contactMessages).values({
      id: newId(),
      name,
      email,
      message,
      locale: resolveLocale(input.locale) ?? 'en',
    });

    return { ok: true };
  }

  private async assertContactLimits(ip: string, email: string | null): Promise<void> {
    const allowed = await Promise.all([
      this.consumeBucket(
        `rl:contact:${ip}`,
        this.env.CONTACT_RATE_LIMIT_MAX,
        this.env.CONTACT_RATE_LIMIT_WINDOW_MS,
      ),
      email
        ? this.consumeBucket(
            `rl:contact:email:${email}`,
            this.env.CONTACT_EMAIL_RATE_LIMIT_MAX,
            this.env.CONTACT_EMAIL_RATE_LIMIT_WINDOW_MS,
          )
        : Promise.resolve(true),
    ]);

    if (allowed.some((ok) => !ok)) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'Too many messages from this network', 429);
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
