import { describe, expect, it } from 'vitest';

import { canManageStaff, canModerate, canMutateStaff } from './staff-access';

describe('staff access', () => {
  it('lets every staff role moderate', () => {
    expect(canModerate('owner')).toBe(true);
    expect(canModerate('admin')).toBe(true);
    expect(canModerate('moderator')).toBe(true);
  });

  it('keeps staff management off moderators', () => {
    expect(canManageStaff('owner')).toBe(true);
    expect(canManageStaff('admin')).toBe(true);
    expect(canManageStaff('moderator')).toBe(false);
  });

  it('never lets anyone mutate the owner', () => {
    expect(
      canMutateStaff({ id: 'admin-1', role: 'admin' }, { id: 'owner-1', role: 'owner' }),
    ).toBe(false);
    expect(
      canMutateStaff({ id: 'owner-1', role: 'owner' }, { id: 'owner-1', role: 'owner' }),
    ).toBe(false);
  });

  it('lets an admin change another moderator', () => {
    expect(
      canMutateStaff({ id: 'admin-1', role: 'admin' }, { id: 'mod-1', role: 'moderator' }),
    ).toBe(true);
  });

  it('refuses self-service role or status changes', () => {
    expect(
      canMutateStaff({ id: 'admin-1', role: 'admin' }, { id: 'admin-1', role: 'admin' }),
    ).toBe(false);
  });
});
