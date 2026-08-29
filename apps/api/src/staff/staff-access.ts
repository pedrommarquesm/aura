import type { Staff } from '../db/schema';

export const STAFF_ROLES = ['owner', 'admin', 'moderator'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const MANAGE_STAFF_ROLES: readonly StaffRole[] = ['owner', 'admin'];
export const MODERATE_ROLES: readonly StaffRole[] = ['owner', 'admin', 'moderator'];

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

export function canManageStaff(role: StaffRole): boolean {
  return MANAGE_STAFF_ROLES.includes(role);
}

export function canModerate(role: StaffRole): boolean {
  return MODERATE_ROLES.includes(role);
}

export function isOwner(staff: Pick<Staff, 'role'>): boolean {
  return staff.role === 'owner';
}

/**
 * Owner is immutable from the API. Role and status changes, and deactivation,
 * all go through this so a mistaken admin click cannot lock everyone out.
 */
export function canMutateStaff(
  actor: Pick<Staff, 'id' | 'role'>,
  target: Pick<Staff, 'id' | 'role'>,
): boolean {
  if (target.role === 'owner') return false;
  if (actor.id === target.id && actor.role !== 'owner') {
    // Staff may not deactivate or promote themselves. Owner is already refused.
    return false;
  }
  return canManageStaff(actor.role);
}

export function assertAssignableRole(role: StaffRole): role is Exclude<StaffRole, 'owner'> {
  return role !== 'owner';
}
