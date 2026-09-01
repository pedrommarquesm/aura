import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['active', 'suspended', 'banned']);

export const authProvider = pgEnum('auth_provider', ['apple', 'google', 'phone', 'password']);

/**
 * Backoffice roles. Owner is the seeded GOD account and cannot be demoted.
 * Admin can manage staff (except owner). Moderator can act on users/content.
 */
export const staffRole = pgEnum('staff_role', ['owner', 'admin', 'moderator']);

export const staffStatus = pgEnum('staff_status', ['invited', 'active', 'deactivated']);

/**
 * Staff identity providers. Google is V0. `email` is reserved so org-domain
 * accounts can sign in without Google later without another enum migration.
 */
export const staffAuthProvider = pgEnum('staff_auth_provider', ['google', 'email']);

export const reportStatus = pgEnum('report_status', ['open', 'dismissed', 'actioned']);

export const moderationTargetType = pgEnum('moderation_target_type', [
  'user',
  'post',
  'report',
  'staff',
]);

export const moderationActionType = pgEnum('moderation_action_type', [
  'user_status',
  'post_remove',
  'report_dismiss',
  'report_actioned',
  'staff_invite',
  'staff_update',
]);

export const mediaType = pgEnum('media_type', ['photo', 'video']);

/**
 * Posts only enter feeds at `published`. Everything before that is the upload
 * pipeline; `removed` is a moderation takedown (soft delete).
 */
export const postStatus = pgEnum('post_status', [
  'uploading',
  'processing',
  'published',
  'failed',
  'removed',
]);

export const processingStatus = pgEnum('processing_status', [
  'pending',
  'processing',
  'ready',
  'failed',
]);

/**
 * Where an asset's bytes actually live. Stored per asset, never as a global
 * setting, so old media keeps resolving from wherever it already is while new
 * uploads go somewhere else. See docs/backend-architecture.md §6.6.
 */
export const storageProvider = pgEnum('storage_provider', ['r2', 's3', 'bunny', 'local']);

/**
 * Every movement of Aura. REVERSAL covers takedowns and any other correction.
 */
export const reportTargetType = pgEnum('report_target_type', ['user', 'post']);

export const reportReason = pgEnum('report_reason', [
  'spam',
  'harassment',
  'hate',
  'sexual',
  'violence',
  'other',
]);

/**
 * `VOTE` replaced the old flat `LIKE` / `SUPER_LIKE` events in the vote &
 * receipts redesign (docs/redesign-tracker.md). A vote's amount is the
 * voter's chosen signed integer (-100..100, never 0), clamped server-side —
 * see `aura/vote-amount.ts`. `BATTLE_WIN` / `CHALLENGE` / `VOTER_REWARD` stay
 * defined for the parked V1 competition systems (`RDX-60`).
 */
export const auraEventType = pgEnum('aura_event_type', [
  'VOTE',
  'BATTLE_WIN',
  'CHALLENGE',
  'VOTER_REWARD',
  'BONUS',
  'REVERSAL',
]);
