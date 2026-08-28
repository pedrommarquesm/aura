import type { User } from '../db/schema';

/**
 * Aura awarded for a single like.
 *
 * V0: a flat rate for everyone.
 *
 * The value is 10 rather than 1 so that V1 can scale it by the voter's Vote
 * Power without ever introducing fractional Aura — a 1.4x multiplier becomes
 * 14, not 14.0. Aura is an integer everywhere: in the database, in the API,
 * and on screen. Floats in an economy produce rounding drift that nobody can
 * reconcile later.
 *
 * ---
 *
 * V1 will scale this by the voter's Vote Power, so a like from a high-Aura
 * curator is worth more than one from a new account. **Before turning that on,
 * read docs/backend-architecture.md §7.5.** The multiplier is a compounding
 * loop inside a ranked economy, and those fail in predictable ways: the top of
 * the leaderboard mints most of the Aura and becomes unreachable, total supply
 * inflates so a given number stops meaning anything, and collusion gets far
 * more profitable than it is at a flat rate.
 *
 * The guardrails that section requires, all of them:
 *
 *   1. Sublinear curve — Vote Power grows with something like log(aura),
 *      never linearly.
 *   2. Hard cap on the multiplier itself, not just on its input.
 *   3. Floor of 1.0x. A newcomer's like is never worth *less* than today's 10;
 *      we add upside for curators, we never devalue new users.
 *   4. A per-voter daily budget on minted Aura, so nobody can mint without
 *      limit simply by liking a thousand posts.
 *   5. Drive it from Aura Sense (prediction quality), not from wealth alone.
 *      That rewards curation skill rather than seniority, which is the loop
 *      that makes Aura different from a normal social network.
 *
 * Because every award is a ledger row, a candidate formula can be replayed
 * against real `aura_events` and inspected for distribution damage — Gini,
 * top-1% share, time-to-first-1000 for a new account — before it ever reaches
 * production. Do that. Do not tune this live on real users.
 *
 * When it ships, the constants belong in remote config, not in a deploy.
 */
export const BASE_LIKE_AURA = 10;

export function auraForLike(_voter: Pick<User, 'id' | 'aura' | 'votePower'>): number {
  return BASE_LIKE_AURA;
}

/**
 * Aura for a Super Like. Not reachable in V0 — the endpoint does not exist —
 * but defined here so the multiplier never gets scattered across handlers.
 */
export const SUPER_LIKE_MULTIPLIER = 5;

export function auraForSuperLike(voter: Pick<User, 'id' | 'aura' | 'votePower'>): number {
  return auraForLike(voter) * SUPER_LIKE_MULTIPLIER;
}
