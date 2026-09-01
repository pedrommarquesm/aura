/**
 * Vote amount rules for the vote & receipts redesign.
 *
 * V0's `auraForLike()` computed the award server-side (flat 10, with a
 * documented seam for a hidden Vote Power multiplier). That model is gone:
 * the voter now **chooses** the magnitude with the slider, from -100 to
 * +100. The server's only job is to validate and clamp what the client
 * sends — never to compute it.
 *
 * Locked in docs/redesign-tracker.md:
 *   - Q1: step 1, whatever integer the thumb lands on.
 *   - Q2: releasing at 0 is a client-side cancel. The server never sees a
 *     0 amount; if it does, reject it rather than silently dropping it.
 *   - Q7: the cap is strictly ±100. No overlay or receipt may reference a
 *     larger number — this function is the only place that enforces it.
 *   - Q17: Vote Power / multipliers are parked. Do not scale this value by
 *     the voter's own Aura or any other factor. A chosen -100 already is the
 *     voter's full intensity; multiplying it recreates the compounding loop
 *     architecture §7.5 exists to warn about.
 */
export const MIN_VOTE_AURA = -100;
export const MAX_VOTE_AURA = 100;

export function isValidVoteAmount(amount: unknown): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isInteger(amount) &&
    amount !== 0 &&
    amount >= MIN_VOTE_AURA &&
    amount <= MAX_VOTE_AURA
  );
}
