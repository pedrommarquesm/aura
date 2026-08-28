import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['active', 'suspended', 'banned']);

export const authProvider = pgEnum('auth_provider', ['apple', 'google', 'phone']);

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

export const likeKind = pgEnum('like_kind', ['like', 'super_like']);

/**
 * Every movement of Aura. REVERSAL covers unlikes and moderation takedowns.
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

export const auraEventType = pgEnum('aura_event_type', [
  'LIKE',
  'SUPER_LIKE',
  'BATTLE_WIN',
  'CHALLENGE',
  'VOTER_REWARD',
  'BONUS',
  'REVERSAL',
]);
