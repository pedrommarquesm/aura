import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { DeviceInfo, IssuedTokens } from '../auth/tokens.service';
import { GoogleProvider } from '../auth/providers/google.provider';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { moderationActions, staff, staffIdentities, type Staff } from '../db/schema';

import {
  assertAssignableRole,
  canManageStaff,
  canMutateStaff,
  type StaffRole,
} from './staff-access';
import { normalizeEmail, parseAllowedDomains } from './staff-email';
import { decideStaffSignIn } from './staff-sign-in';
import { StaffTokensService } from './staff-tokens.service';

export interface PublicStaff {
  id: string;
  email: string;
  displayName: string | null;
  role: Staff['role'];
  status: Staff['status'];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface StaffSignInResult extends IssuedTokens {
  staff: PublicStaff;
}

@Injectable()
export class StaffService implements OnModuleInit {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    private readonly tokens: StaffTokensService,
    private readonly google: GoogleProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureOwner();
  }

  /**
   * Makes sure the GOD row exists. Idempotent: if an owner is already there
   * we leave it alone, so a dashboard invite never races a boot.
   */
  async ensureOwner(): Promise<void> {
    const email = normalizeEmail(this.env.STAFF_OWNER_EMAIL);

    const existingOwner = await this.db.query.staff.findFirst({
      where: (table, { eq: equals }) => equals(table.role, 'owner'),
    });

    if (existingOwner) return;

    const existingEmail = await this.findByEmail(email);
    if (existingEmail) {
      await this.db
        .update(staff)
        .set({ role: 'owner', status: 'invited', updatedAt: new Date(), deactivatedAt: null })
        .where(eq(staff.id, existingEmail.id));
      return;
    }

    await this.db.insert(staff).values({
      id: newId(),
      email,
      displayName: 'Owner',
      role: 'owner',
      status: 'invited',
    });
  }

  async signInWithGoogle(
    identityToken: string,
    options: { nonce?: string; device?: DeviceInfo } = {},
  ): Promise<StaffSignInResult> {
    const identity = await this.google.verify(identityToken, options.nonce);
    const email = identity.email ? normalizeEmail(identity.email) : undefined;

    const existingBySub = await this.db.query.staffIdentities.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.provider, 'google'), equals(table.providerSub, identity.subject)),
    });

    const linked = existingBySub
      ? await this.db.query.staff.findFirst({
          where: (table, { eq: equals }) => equals(table.id, existingBySub.staffId),
        })
      : undefined;

    const existingByEmail = email ? await this.findByEmail(email) : undefined;

    const decision = decideStaffSignIn({
      email,
      ownerEmail: this.env.STAFF_OWNER_EMAIL,
      allowedDomains: parseAllowedDomains(this.env.STAFF_ALLOWED_DOMAINS),
      existingBySub: linked,
      existingByEmail,
    });

    if (decision.kind === 'reject') {
      throw this.rejectError(decision.reason);
    }

    let member: Staff;

    if (decision.kind === 'existing' && decision.match === 'identity' && linked) {
      member = linked;
    } else if (decision.kind === 'existing' && decision.match === 'email' && existingByEmail) {
      member = existingByEmail;
    } else if (decision.kind === 'bootstrap-owner') {
      member = await this.claimOrCreateOwner(email!);
    } else {
      member = await this.autoProvision(email!, identity.name);
    }

    await this.linkGoogleIdentity(member.id, identity.subject, email);

    const now = new Date();
    const [updated] = await this.db
      .update(staff)
      .set({
        status: 'active',
        lastLoginAt: now,
        updatedAt: now,
        displayName: member.displayName ?? identity.name ?? member.displayName,
        email: email ?? member.email,
      })
      .where(eq(staff.id, member.id))
      .returning();

    const issued = await this.tokens.issue(member.id, options.device ?? {});

    return { ...issued, staff: toPublicStaff(updated ?? member) };
  }

  async findById(staffId: string): Promise<Staff | undefined> {
    return this.db.query.staff.findFirst({
      where: (table, { eq: equals }) => equals(table.id, staffId),
    });
  }

  async list(): Promise<PublicStaff[]> {
    const rows = await this.db.select().from(staff).orderBy(staff.createdAt);
    return rows.map(toPublicStaff);
  }

  async invite(
    actor: Staff,
    input: { email: string; role: StaffRole; displayName?: string },
  ): Promise<PublicStaff> {
    if (!canManageStaff(actor.role)) {
      throw AppError.forbidden('You cannot manage staff');
    }

    if (!assertAssignableRole(input.role)) {
      throw new AppError(ErrorCode.CANNOT_MUTATE_OWNER, 'Owner cannot be invited', 403);
    }

    const email = normalizeEmail(input.email);
    const existing = await this.findByEmail(email);

    if (existing) {
      throw AppError.conflict(ErrorCode.CONFLICT, 'That email is already on staff');
    }

    const [created] = await this.db
      .insert(staff)
      .values({
        id: newId(),
        email,
        displayName: input.displayName?.trim() || null,
        role: input.role,
        status: 'invited',
      })
      .returning();

    await this.recordAction(actor.id, 'staff_invite', created!.id, {
      email,
      role: input.role,
    });

    return toPublicStaff(created!);
  }

  async update(
    actor: Staff,
    staffId: string,
    input: { role?: StaffRole; status?: Staff['status']; displayName?: string | null },
  ): Promise<PublicStaff> {
    const target = await this.findById(staffId);
    if (!target) throw AppError.notFound('Staff member not found');

    if (!canMutateStaff(actor, target)) {
      throw new AppError(
        ErrorCode.CANNOT_MUTATE_OWNER,
        'That staff member cannot be changed',
        403,
      );
    }

    if (input.role && !assertAssignableRole(input.role)) {
      throw new AppError(ErrorCode.CANNOT_MUTATE_OWNER, 'Cannot assign the owner role', 403);
    }

    const nextStatus = input.status ?? target.status;
    const deactivatedAt =
      nextStatus === 'deactivated' ? (target.deactivatedAt ?? new Date()) : null;

    const [updated] = await this.db
      .update(staff)
      .set({
        role: input.role ?? target.role,
        status: nextStatus,
        displayName: input.displayName === undefined ? target.displayName : input.displayName,
        deactivatedAt,
        updatedAt: new Date(),
      })
      .where(eq(staff.id, staffId))
      .returning();

    if (nextStatus === 'deactivated') {
      await this.tokens.revokeAllForStaff(staffId);
    }

    await this.recordAction(actor.id, 'staff_update', staffId, {
      role: input.role,
      status: input.status,
    });

    return toPublicStaff(updated!);
  }

  private async findByEmail(email: string): Promise<Staff | undefined> {
    const [row] = await this.db
      .select()
      .from(staff)
      .where(sql`lower(${staff.email}) = ${normalizeEmail(email)}`)
      .limit(1);

    return row;
  }

  private async claimOrCreateOwner(email: string): Promise<Staff> {
    const existing = await this.db.query.staff.findFirst({
      where: (table, { eq: equals }) => equals(table.role, 'owner'),
    });

    if (existing) {
      if (normalizeEmail(existing.email) !== email) {
        await this.db
          .update(staff)
          .set({ email, updatedAt: new Date() })
          .where(eq(staff.id, existing.id));
        return { ...existing, email };
      }
      return existing;
    }

    const [created] = await this.db
      .insert(staff)
      .values({
        id: newId(),
        email,
        displayName: 'Owner',
        role: 'owner',
        status: 'invited',
      })
      .returning();

    return created!;
  }

  private async autoProvision(email: string, name?: string): Promise<Staff> {
    const [created] = await this.db
      .insert(staff)
      .values({
        id: newId(),
        email,
        displayName: name ?? null,
        role: 'moderator',
        status: 'invited',
      })
      .returning();

    return created!;
  }

  private async linkGoogleIdentity(
    staffId: string,
    providerSub: string,
    email: string | undefined,
  ): Promise<void> {
    const existing = await this.db.query.staffIdentities.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.provider, 'google'), equals(table.providerSub, providerSub)),
    });

    if (existing) {
      await this.db
        .update(staffIdentities)
        .set({ lastLoginAt: new Date(), emailAtSignup: email ?? existing.emailAtSignup })
        .where(eq(staffIdentities.id, existing.id));
      return;
    }

    await this.db.insert(staffIdentities).values({
      id: newId(),
      staffId,
      provider: 'google',
      providerSub,
      emailAtSignup: email ?? null,
      lastLoginAt: new Date(),
    });
  }

  private async recordAction(
    staffId: string,
    action: 'staff_invite' | 'staff_update',
    targetId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(moderationActions).values({
      id: newId(),
      staffId,
      action,
      targetType: 'staff',
      targetId,
      metadata,
    });
  }

  private rejectError(reason: 'not_staff' | 'deactivated' | 'email_required'): AppError {
    if (reason === 'deactivated') {
      return new AppError(
        ErrorCode.STAFF_DEACTIVATED,
        'This staff account is no longer active',
        403,
      );
    }

    if (reason === 'email_required') {
      return new AppError(
        ErrorCode.STAFF_EMAIL_REQUIRED,
        'Google did not share an email address. Allow email access and try again.',
        403,
      );
    }

    return new AppError(
      ErrorCode.NOT_STAFF,
      'This Google account is not on the staff list',
      403,
    );
  }
}

export function toPublicStaff(row: Staff): PublicStaff {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
